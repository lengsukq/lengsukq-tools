/* Run: node tests/neon-survivor-dash-runtime.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='public/Game/neon-survivor/js/';
const elements=new Map();
const el=id => elements.get(id) || null;
for(const id of ['phantom-ecto-hud','phantom-ecto-text','phantom-ecto-fill',
  'phantom-touch-actions','phantom-dock-action']) {
  elements.set(id,{hidden:true,style:{},textContent:'',disabled:false});
}
const env={window:{addEventListener(){}},document:{getElementById:el},
  navigator:{getGamepads:()=>[]},performance:{now:()=>1000},console,
  localStorage:{getItem:()=>null,setItem(){}},
  setTimeout,clearTimeout,setInterval,clearInterval};
vm.createContext(env);
for(const module of ['ships','ships.generated','core'])
  vm.runInContext(fs.readFileSync(root+module+'.js','utf8'),env);
const ships=env.window.NeonShips;
const proto=vm.runInContext('NeonSurvivorGame.prototype',env);
const SoundEngine=vm.runInContext('SoundEngine',env);

// The old merge accidentally installed the Phantom game controller on the
// audio class; its toggle even contained an undefined key event reference.
const sound=new SoundEngine();
assert.equal(sound.toggle(),false);
assert.equal(sound.toggle(),true);
assert.equal(typeof sound.togglePhantomDock,'undefined');
assert.equal(typeof proto.togglePhantomDock,'function');
assert.equal(typeof proto.playCombatSound,'function');

function gameFor(id) {
  const player={...ships.startingState(id),
    level:1,xp:0,xpNeeded:61,crystals:0,regen:ships.get(id).baseStats.regen,
    maxHp:ships.get(id).baseStats.hp,hp:ships.get(id).baseStats.hp,
    dashRechargeTime:2.2,dashRechargeTimer:0,cdrMultiplier:1,
    dmgMultiplier:1,passives:{},dashUpgrades:{},limitBreaks:{},
    aimAngle:0,radius:16,hasAegis:false,dashCombo:0,invulnTimer:0
  };
  const game=Object.assign(Object.create(proto),{
    state:'playing',settingsOpen:false,player,keys:{},
    touch:{active:false},gamepadMove:{x:0,y:0},gamepadIndex:-1,
    survivalTime:1,screenShake:0,kills:0,shockwaves:[],
    enemies:[],particles:[],texts:[],dashTrails:[],
    combatTelemetry:{preciseDashes:0,invulnerableSeconds:0},
    sound:{playDash(){}},vibrateGamepad(){},
    lanCoop:null,currentBoss:null,
    hudLevel:{},hudHp:{style:{},parentElement:null},
    hudXp:{style:{}},hudTimer:{},hudKills:{},hudCrystals:{},
    bossHud:{style:{}},bossHpFill:{style:{}}
  });
  if(id==='riftblade')player.dashCharges=Math.max(1,player.maxDashCharges-1);
  if(id==='astra') {
    env.window.NeonAstra.state(player).blinkCharges=1;
  }
  if(id==='phantom') {
    env.window.NeonPhantom.state(player).dashCharges=1;
  }
  return game;
}
for(const id of ['riftblade','astra','phantom']) {
  const game=gameFor(id);
  // Reproduces the original all-ship crash: with an unfilled dash charge,
  // updateHUD dereferenced undeclared `isPhantom` and aborted every RAF.
  assert.doesNotThrow(()=>game.updateHUD(),id+' HUD with missing dash charge');
  assert.doesNotThrow(()=>game.triggerDash(),id+' dash action');
  assert.doesNotThrow(()=>game.updateHUD(),id+' HUD immediately after dash');
  if(id==='riftblade')assert.equal(game.player.isDashing,true);
  if(id==='astra')assert.ok(game.player.astra.blinkFx?.life>0);
  if(id==='phantom') {
    assert.equal(game.player.phantom.shiftActive,true);
    assert.equal(elements.get('phantom-ecto-hud').hidden,true,'phantom-ecto-hud permanently hidden');
    assert.equal(game.togglePhantomDock(),false,'Solo Phantom cannot dock');
    assert.doesNotThrow(()=>game.triggerDash(),'Second dash ends shift');
    assert.equal(game.player.phantom.shiftActive,false);
  }
}
// Mass enemy deaths must not allocate one expensive audio buffer per corpse.
const game=gameFor('riftblade');
let explosions=0,slashes=0;
for(let i=0;i<160;i++) {
  game.playCombatSound('explosion',()=>explosions++,1);
  game.playCombatSound('dash-impact',()=>slashes++,2);
}
assert.equal(explosions,1);
assert.equal(slashes,2);
game.survivalTime+=.016;
assert.equal(game.playCombatSound('explosion',()=>explosions++,1),true);
assert.equal(explosions,2);
// Exercise the REAL mass-death/drop path, not just the sound-budget helper.
const mass=gameFor('riftblade');
mass.difficulty=0;
mass.endlessMode=false;
mass.gems=[];
mass.fxLow=false;
mass.combatTelemetry.nukeDrops=0;
let audioNodes=0;
mass.sound={playExplosion(){audioNodes++;},playDash(){}};
for(let i=0;i<140;i++)mass.onEnemyKilled({
  type:'grunt',x:10+i%4,y:5,color:'#0ff',xpVal:3,
  radius:10,isElite:false,isBoss:false
},'dash');
assert.equal(mass.kills,140,'Every Riftblade dash kill counts');
assert.equal(audioNodes,1,'140 same-frame normal kills create one explosion sound');
assert.ok(mass.gems.length>0,'Experience drops remain rewarded');
for(let i=0;i<55;i++)mass.onEnemyKilled({
  type:'elite',x:10+i%3,y:5,color:'#ffd700',xpVal:12,
  radius:12,isElite:true,isBoss:false
},'dash');
assert.equal(mass.kills,195);
assert.ok(audioNodes<=2,'Same-frame elite/normal kills have bounded WebAudio');
assert.ok(mass.shockwaves.length<=36,'Elite kill shockwaves stay bounded');
assert.ok(mass.texts.length<=36,'Elite kill text nodes stay bounded');
console.log('All three dashes and HUDs passed, audio class boundaries restored, Phantom controls are on Game, and 160 mass-hit sounds are frame-limited.');
