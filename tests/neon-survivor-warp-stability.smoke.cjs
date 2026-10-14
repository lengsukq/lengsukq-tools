/* Run: node tests/neon-survivor-warp-stability.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root='public/Game/neon-survivor/js/';
const context={window:{addEventListener(){}},console,performance:{now:()=>1000},
  document:{getElementById:()=>null},
  navigator:{getGamepads:()=>[]},
  localStorage:{getItem:()=>null,setItem(){}},
  setTimeout,clearTimeout,setInterval,clearInterval};
vm.createContext(context);
neonCore.runScripts(context, ['ships','ships.generated']);
const ships=context.window.NeonShips;
const proto=vm.runInContext('NeonSurvivorGame.prototype',context);
const enemies=Array.from({length:400},(_,i)=>({
  x:40+(i%25)*9,y:(Math.floor(i/25)-8)*12,
  hp:10000,maxHp:10000,radius:12,dead:false
}));
const game={state:'playing',survivalTime:4,enemies,shockwaves:[],particles:[],
  bullets:[],enemyBullets:[],texts:[],gems:[],dashTrails:[],
  dealDamage(enemy,dmg){if(Number.isFinite(dmg)&&dmg>0)enemy.hp-=dmg;},
  players:{list(){return[{id:'host',state:this.host}];},host:null}
};
const astra={...ships.startingState('astra'),x:0,y:0,radius:16,level:1,
  dmgMultiplier:1,cdrMultiplier:1,passives:{},dashUpgrades:{}};
const phantom={...ships.startingState('phantom'),x:0,y:0,radius:16,level:1,
  dmgMultiplier:1,cdrMultiplier:1,passives:{},dashUpgrades:{}};
const calls=[];
const ctx=new Proxy({}, {get(target,prop){if(prop in target)return target[prop];
  return (...args)=>{calls.push([prop,...args]);};},
  set(target,prop,value){target[prop]=value;return true;}});
game.players.host=astra;
ships.runAbility(astra,'onStart',game);
assert.equal(ships.runAbility(astra,'onAction',game,
  {kind:'blink',direction:{x:1,y:0}}),true);
assert.equal(astra.x,160);
assert.equal(astra.astra.blinkFx?.life,.32);
assert.equal(ships.drawPilotEffects(ctx,astra,game),true);
assert.ok(calls.some(call=>call[0]==='lineTo'),
  'Astra blink must paint a visible origin-to-destination energy ribbon');
const astranet=ships.projectForNetwork(astra).astra;
assert.equal(astranet.blinkFx.x2,160);
calls.length=0;
assert.equal(ships.drawNetworkEffects(ctx,{shipId:'astra',astra:astranet},game),true);
assert.ok(calls.some(call=>call[0]==='lineTo'),'Remote Astra has blink effects');
context.window.NeonAstra.tick(astra,game,.4);
assert.equal(astra.astra.blinkFx,null,'Astra FX expires without accumulating');

game.players.host=phantom;
ships.runAbility(phantom,'onStart',game);
assert.equal(ships.runAbility(phantom,'onAction',game,'shift'),true);
assert.equal(phantom.phantom.shiftActive,true);
for(let frame=0;frame<315;frame++){
  game.survivalTime+=.016;
  phantom.x+=2;
  context.window.NeonPhantom.tick(phantom,game,.016);
  assert.ok(phantom.phantom.shiftTrail.length<=10,'Afterimages stay bounded');
  assert.ok(phantom.phantom.marks.size<=64,'Soul marks stay bounded');
  assert.ok(game.shockwaves.length<=40,'Shift FX must not overflow world shockwaves');
}
assert.equal(phantom.phantom.shiftActive,false,'Shift expires exactly once');
assert.ok(phantom.phantom.reapFlash>=0);
game.survivalTime+=2; // clear the post-shift re-entry lockout
phantom.phantom.stealthEnergy=4.8;
assert.equal(ships.runAbility(phantom,'onAction',game,'shift'),true);
assert.equal(ships.runAbility(phantom,'onAction',game,'reap'),true);
assert.equal(phantom.phantom.shiftActive,false,
  'Second dash must end shift even without any soul marks');
assert.equal(ships.runAbility(phantom,'onAction',game,'reap'),false,
  'Repeated reap after exit is rejected (no repeat damage)');
assert.ok(phantom.phantom.reapFlash>0);
calls.length=0;
assert.equal(ships.drawPilotEffects(ctx,phantom,game),true);
assert.ok(calls.some(call=>call[0]==='arc'),
  'Phantom shift and reap must draw visible effects');
const phantomNet=ships.projectForNetwork(phantom).phantom;
assert.ok(phantomNet.shiftTrail.length<=10);
assert.ok(JSON.stringify(ships.projectForNetwork(phantom)).length<4096);
assert.equal(ships.drawNetworkEffects(ctx,
  {shipId:'phantom',x:phantom.x,y:phantom.y,spectral:phantomNet},game),true);

// Oversized or malformed pickup XP must never hang the main thread.
const levelGame=Object.assign(Object.create(proto),{
  state:'playing',player:{shipId:'riftblade',xp:0,level:1,
    xpNeeded:61,crystals:0,passives:{}}, pendingLevelUps:0,
  updateHUD(){},triggerLevelUp(){},recalculateMoveSpeed(){},recalculateDashStats(){}
});
for(const input of [Infinity,NaN,-5,0])levelGame.gainXP(input);
assert.equal(levelGame.player.level,1);
assert.equal(levelGame.player.crystals,0);
levelGame.gainXP(1e20);
assert.ok(levelGame.player.level<=9,'Huge pickup has a hard eight-level limit');
assert.ok(Number.isFinite(levelGame.player.xp));
levelGame.player.xp=Infinity;
levelGame.gainXP(5);
assert.ok(Number.isFinite(levelGame.player.xp),'Corrupt previous XP is self-healed');
levelGame.player.xpNeeded=0;
levelGame.gainXP(5);
assert.ok(levelGame.player.xpNeeded>0,'Invalid XP requirement is repaired');

// A warp into a large pile of XP must yield to the FIRST level-up modal.
// The rest of the pile is left in the world for later frames, not processed
// synchronously during the pause as happened before this regression.
const pickupGame=Object.assign(Object.create(proto),{
  state:'playing',survivalTime:0,difficulty:0,endlessMode:false,
  player:{shipId:'riftblade',x:0,y:0,vx:0,vy:0,radius:16,
    hp:100,maxHp:100,regen:.8,level:1,xp:0,xpNeeded:61,
    crystals:0,invulnTimer:0,invuln:0,baseSpeed:240,magnetRadius:120,
    isDashing:false,dashCharges:3,maxDashCharges:3,dashRechargeTimer:0,
    dashRechargeTime:2.2,cdrMultiplier:1,passives:{},weapons:{blaster:1}},
  enemies:[],bullets:[],enemyBullets:[],particles:[],shockwaves:[],
  texts:[],dashTrails:[],gems:Array.from({length:200},()=>({
    x:0,y:0,radius:5,type:'gem',value:70,color:'#00f3ff'
  })),
  orbiters:[],companionDrones:[],laserBeams:[],blackHoles:[],mines:[],
  lightningTethers:[],keys:{},touch:{active:false},gamepadMove:{x:0,y:0},
  camera:{x:0,y:0},lastAfkX:0,lastAfkY:0,afkTimer:0,
  combatTelemetry:{invulnerableSeconds:0,preciseDashes:0},
  screenShake:0,sound:{playGemPickup(){},playLaser(){},playZap(){},playNuke(){}},
  updateSpawning(){},updateHUD(){},
  triggerLevelUp(){this.state='levelup';},
  recalculateMoveSpeed(){},recalculateDashStats(){},
  getEffectiveDashRecharge(){return 2.2;}
});
pickupGame.update(.016);
assert.equal(pickupGame.state,'levelup');
assert.equal(pickupGame.player.level,2);
assert.equal(pickupGame.player.crystals,1,
  'Only one pickup may complete when the first level-up opens');
assert.equal(pickupGame.gems.reduce((sum,gem)=>sum+gem.value,0),199*70,
  'Gem compaction may merge remaining drops but must never erase earned XP');
console.log('Warp stability passed: Astra/Phantom local+remote FX, transient lifetimes, 400-enemy shift stress, one-shot reap, bounded marks/trails, finite XP and bounded level-ups.');
