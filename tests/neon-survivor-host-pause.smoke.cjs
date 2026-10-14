/* Run: node tests/neon-survivor-host-pause.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const sandbox={
  window:{addEventListener(){}},console,performance:{now:()=>1000},
  navigator:{getGamepads:()=>[]},document:{getElementById:()=>null},
  localStorage:{getItem:()=>null,setItem(){}},
  setTimeout,clearTimeout,setInterval,clearInterval
};
vm.createContext(sandbox);
const root='public/Game/neon-survivor/js/';
neonCore.runScripts(sandbox, ['players','network/schema','network/coop']);
const proto=vm.runInContext('NeonSurvivorGame.prototype',sandbox);
const Coop=sandbox.window.NeonLanCoop.Coop;
const makeGame=()=>Object.assign(Object.create(proto),{
  state:'playing',survivalTime:25,kills:1,width:400,height:600,
  player:{x:0,y:0,hp:100,maxHp:100,level:1,xp:10,xpNeeded:51},
  enemies:[],gems:[],bullets:[],enemyBullets:[],particles:[],shockwaves:[],texts:[],
  releaseJoystickTouch(){this.touchReleased=true;},
  renderStatsTable(){},modalPause:{classList:{add(){},remove(){}}},
  lastTime:0
});
const game=makeGame();
const sent=[];
const rtc={connected:true,role:'host',send(payload){sent.push(payload);return true;}};
const coop=new Coop(game,rtc);
game.lanCoop=coop;
coop.startHost();
coop.onMessage({type:'input',seq:1,dx:1,dy:0,aim:0,dash:false});
const x=coop.ally.x;
game.pauseGame();
assert.equal(game.state,'paused');
assert.equal(game.touchReleased,true);
assert.equal(coop.ally.input.dx,0);
const charges=coop.ally.dashCharges;
coop.onMessage({type:'input',seq:2,dx:1,dy:0,aim:0,dash:true});
assert.equal(coop.ally.dashCharges,charges,'Guest cannot dash during host pause');
assert.equal(coop.ally.lastSeq,2);
coop.updateHost(.24);
assert.equal(coop.ally.x,x);
assert.equal(game.survivalTime,25);
assert.equal(sent.at(-1).phase,'paused','Host broadcasts pause to the guest');
game.resumeGame();
assert.equal(game.state,'playing');
coop.onMessage({type:'input',seq:3,dx:1,dy:0,aim:0,dash:false});
assert.equal(coop.ally.input.dx,1,'Guest controls restored after resume');
const guest=makeGame();
guest.state='lan-client';
guest.lanCoop={guestMode:true};
guest.pauseGame();
assert.equal(guest.state,'lan-client','Guest cannot pause world');
guest.resumeGame();
assert.equal(guest.state,'lan-client','Guest cannot resume world');
const settings=fs.readFileSync(root+'settings.js','utf8');
assert.match(settings,/if \(game\.state === 'playing'\) \{\s*game\.state = 'paused'/);
assert.match(settings,/game\.lanCoop\.ally\.lastInputAt = 0/);
assert.match(settings,/if \(priorState === 'playing' && game\.state === 'paused'\)/);
assert.match(fs.readFileSync(root+'network/coop.js','utf8'),/房主已暂停/);
console.log('Host pause passed: host-only control, frozen remote actions, paused snapshot and guest settings isolation.');
