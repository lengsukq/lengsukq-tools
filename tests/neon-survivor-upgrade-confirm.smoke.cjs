/* Run: node tests/neon-survivor-upgrade-confirm.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/js/';
class Element {
  constructor() {
    this.children=[]; this.parentNode=null; this.className='';this.style={};
    this.attrs={};this.classList={active:false,
      contains:name=>(this.className || '').split(/\s+/).includes(name),
      add:name=>{this.classList.active=true;this.className=((this.className || '')+' '+name).trim();},
      remove:name=>{this.classList.active=false;this.className=(this.className || '').split(/\s+/).filter(x=>x!==name).join(' ');}};
  }
  set innerHTML(v){this.html=v;this.children=[];}
  get innerHTML(){return this.html||'';}
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
  replaceChildren(...items){this.children=items;for(const item of items)item.parentNode=this;}
  querySelector(q){return this.children.find(item=>'#'+item.id===q)||null;}
  setAttribute(name,value){this.attrs[name]=value;}
  click(){if(!this.disabled)this.onclick?.();}
}
let pads=[];
const sandbox={window:{addEventListener(){}},console,
  performance:{now:()=>1000},
  navigator:{getGamepads:()=>pads},
  document:{createElement:()=>new Element(),getElementById:()=>null,
    querySelectorAll:()=>hostGame?.upgradeGrid?.children||[]},
  localStorage:{getItem:()=>null,setItem(){}},
  setTimeout,clearTimeout,setInterval,clearInterval};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['network/schema','rarity','network/experience','network/coop']);
const proto=vm.runInContext('NeonSurvivorGame.prototype',sandbox);
const Coop=sandbox.window.NeonLanCoop.Coop;
let hostGame=null;
function makeGame(credits=2){
  const modal=new Element(),container=new Element(),grid=new Element();
  container.appendChild(grid);
  const game=Object.assign(Object.create(proto),{
    state:'playing',difficulty:0,endlessMode:false,
    player:{x:0,y:0,hp:100,maxHp:100,level:5,xp:0,xpNeeded:100,
      weapons:{blaster:1},passives:{},dashUpgrades:{}},
    pendingLevelUps:credits,upgradeGrid:grid,modalLevelup:modal,
    shockwaves:[],banishedUpgrades:new Set(),
    sound:{playLevelUp(){},playLaser(){}},
    gamepadPrevButtons:{},gamepadSelectedUpgradeIdx:0,gamepadNavTimer:0,
    gamepadIndex:-1,keys:{},
    vibrateGamepad(){},
    applyUpgrade(card){
      const bag=card.type==='weapon'?this.player.weapons:
        card.type==='passive'?this.player.passives:this.player.dashUpgrades;
      bag[card.id]=(bag[card.id]||0)+1;
    }
  });
  return game;
}
function actions(game){return game.upgradeGrid.parentNode.querySelector('#upgrade-bank-actions').children;}
function button(game,label){const item=actions(game).find(x=>x.textContent===label);assert.ok(item,label);return item;}

// Preview and cancel never spend a credit, mutate equipment or end the modal.
{
  const game=makeGame(2);hostGame=game;
  game.triggerLevelUp();
  const [first,second]=game.currentUpgradeChoices;
  assert.ok(button(game,'确定升级').disabled);
  assert.ok(button(game,'取消选择').disabled);
  game.upgradeGrid.children[0].click();
  assert.equal(game.pendingUpgradeId,first.id);
  assert.match(game.upgradeGrid.children[0].className,/selected-pending/);
  assert.match(actions(game).find(x=>/待确认/.test(x.textContent)).textContent,/尚未生效/);
  assert.equal(game.pendingLevelUps,2);
  assert.equal(game.upgradeSession.picked.size,0);
  assert.equal(game.finishUpgradeSelection(),false,'Cannot bank while preview is pending');
  assert.equal(button(game,'确定升级').disabled,false);
  assert.equal(button(game,'取消选择').disabled,false);
  button(game,'取消选择').click();
  assert.equal(game.pendingUpgradeId,null);
  assert.equal(game.pendingLevelUps,2);
  assert.equal(game.state,'levelup');
  assert.doesNotMatch(game.upgradeGrid.children[0].className,/selected-pending/);
  game.upgradeGrid.children[0].click();
  game.upgradeGrid.children[1].click();
  assert.equal(game.pendingUpgradeId,second.id,'Changing mind replaces the draft');
  button(game,'确定升级').click();
  assert.equal(game.pendingLevelUps,1);
  assert.equal(game.upgradeSession.picked.has(first.id),false);
  assert.equal(game.upgradeSession.picked.has(second.id),true);
  assert.match(game.upgradeGrid.children[1].className,/picked/);
  assert.equal(game.pendingUpgradeId,null);
  game.upgradeGrid.children[1].click();
  assert.equal(game.pendingUpgradeId,null,'Confirmed card cannot be staged again');
  const third=game.currentUpgradeChoices.findIndex(item=>item.id!==second.id);
  game.upgradeGrid.children[third].click();
  assert.equal(game.pendingLevelUps,1);
  button(game,'取消选择').click();
  assert.equal(game.pendingLevelUps,1);
  actions(game).find(item=>/保留剩余/.test(item.textContent)).click();
  assert.equal(game.state,'playing','Bank is available again after cancelling');
  assert.equal(game.pendingLevelUps,1);
}

// Gamepad A is a true two-press confirmation and B cancels safely.
{
  const game=makeGame(1);hostGame=game;game.triggerLevelUp();
  const buttons=Array.from({length:16},()=>({pressed:false}));
  pads=[{connected:true,buttons,axes:[0,0]}];
  function press(index){buttons[index].pressed=true;game.pollGamepad(.016);}
  function release(index){buttons[index].pressed=false;game.pollGamepad(.016);}
  press(0);
  assert.ok(game.pendingUpgradeId);
  assert.equal(game.pendingLevelUps,1);
  release(0);
  press(1);
  assert.equal(game.pendingUpgradeId,null);
  assert.equal(game.pendingLevelUps,1);
  release(1);
  press(0);
  release(0);
  assert.equal(game.pendingLevelUps,1,'First A does not confirm');
  press(0);
  assert.equal(game.pendingLevelUps,0,'Second separated A confirms');
  assert.equal(game.state,'playing');
  pads=[];
}

// Guest card preview cannot send upgrade_pick until Confirm, even after
// double-clicking or changing selection; a failed send preserves the draft.
{
  const game=makeGame(0);hostGame=game;
  const sent=[];
  let reachable=true;
  const rtc={role:'guest',connected:true,send(packet){if(!reachable)return false;sent.push(packet);return true;}};
  const coop=new Coop(game,rtc);coop.guestMode=true;
  const frame={phase:'levelup',teamXP:{level:3},guest:{
    choices:['tesla','missiles','power'],upgradeRound:1,
    pendingUpgrades:1,upgradeCapacity:1,pickedUpgradeIds:[],upgradeFinished:false
  }};
  coop.latest=frame;
  const view=Object.create(game);
  view.player={weapons:{blaster:1},passives:{},dashUpgrades:{}};
  coop.syncGuestUpgrade(frame,view);
  game.upgradeGrid.children[0].click();
  game.upgradeGrid.children[0].click();
  assert.equal(sent.length,0,'Guest double-tap cannot submit');
  button(game,'取消选择').click();
  assert.equal(sent.length,0);
  game.upgradeGrid.children[1].click();
  reachable=false;
  assert.equal(coop.confirmGuestUpgradePreview(),false,'Failed send is not a commit');
  assert.equal(view.pendingUpgradeId,'missiles');
  reachable=true;
  button(game,'确定升级').click();
  assert.equal(sent.length,1);
  assert.equal(sent[0].type,'upgrade_pick');
  assert.equal(sent[0].id,'missiles');
  assert.equal(coop.confirmGuestUpgradePreview(),false,'No duplicate submits while awaiting ACK');
}

// Guest keyboard/gamepad menu must stage first, confirm only on the next
// distinct press. B cancels the stage without sending upgrade_done.
{
  const game=makeGame(0);hostGame=game;
  const sent=[];game.keys={};
  const coop=new Coop(game,{role:'guest',connected:true,send(packet){sent.push(packet);return true;}});
  coop.guestMode=true;
  const frame={phase:'levelup',teamXP:{level:2},guest:{
    choices:['tesla','missiles'],pendingUpgrades:1,upgradeRound:1,
    upgradeCapacity:1,pickedUpgradeIds:[],upgradeFinished:false
  }};
  coop.latest=frame;
  const view=Object.create(game);
  view.player={weapons:{blaster:1},passives:{},dashUpgrades:{}};
  coop.syncGuestUpgrade(frame,view);
  game.keys.enter=true;coop.updateGuest(.016);
  assert.equal(sent.length,0);
  assert.equal(view.pendingUpgradeId,'tesla');
  game.keys.enter=false;coop.updateGuest(.016);
  game.keys.escape=true;coop.updateGuest(.016);
  assert.equal(sent.length,0);
  assert.equal(view.pendingUpgradeId,null);
  game.keys.escape=false;coop.updateGuest(.016);
  game.keys['2']=true;coop.updateGuest(.016);
  assert.equal(view.pendingUpgradeId,'missiles');
  assert.equal(coop.guestSelectionIdx,1,'Number-key preview becomes the focused gamepad selection');
  assert.equal(sent.length,0);
  game.keys['2']=false;coop.updateGuest(.016);
  // Enter confirms the previously previewed number-key selection.
  game.keys.enter=true;coop.updateGuest(.016);
  assert.equal(sent.length,1);
  assert.equal(sent[0].id,'missiles');
}
const html=fs.readFileSync('public/Game/neon-survivor/index.html','utf8');
assert.ok(html.includes('确定升级'));
console.log('Upgrade confirmation passed: preview/cancel, host bank, explicit confirm, A/B two-step, guest send failure and keyboard no-early-packet.');
