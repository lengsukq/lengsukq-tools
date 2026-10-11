/* Run: node tests/neon-survivor-pilots.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='public/Game/neon-survivor/js/';
const env={window:{},console};
vm.createContext(env);
for(const f of ['ships','ships.generated','players','combat/pilots'])
  vm.runInContext(fs.readFileSync(root+f+'.js','utf8'),env);
const {createRemotePilot}=env.window.NeonPlayers;
const pilotSystem=env.window.NeonPilotSystem;
const hit=[];
const game={state:'playing',player:{x:0,y:0,level:4,xp:20,xpNeeded:90},
  enemies:[],enemyBullets:[],shockwaves:[],dashTrails:[],survivalTime:10,
  dealDamage(enemy,damage,source,critical,owner){
    hit.push({damage,source,owner});enemy.hp-=damage;
  }};
const pilots=['guest','guest-2','guest-3'].map(id=>createRemotePilot(game,id));
assert.deepEqual(pilots.map(p=>[p.x,p.y]),[[60,0],[-60,0],[0,60]]);
assert.equal(pilots.every(p=>p.hp===100&&p.weapons.blaster===1),true);
assert.throws(()=>createRemotePilot(game,'attacker'),/Invalid remote pilot ID/);
const [first,second,third]=pilots;
first.input={dx:1,dy:0,aim:0,dash:false};first.lastInputAt=1000;
const input=pilotSystem.inputFor(first,1000);
assert.equal(input.dx,1);
assert.equal(pilotSystem.inputFor(first,2000).dx,0,'Stale remote input stops movement');
const previous=first.x;
assert.equal(pilotSystem.stepRemote(game,first,input,.1),true);
assert.ok(first.x>previous);
assert.equal(first.level,game.player.level);
assert.equal(first.xp,game.player.xp);
assert.equal(second.x,-60,'Other pilots must not share movement state');

const enemy={x:first.x+30,y:first.y,hp:1000,radius:12,dead:false};
game.enemies.push(enemy);
assert.equal(pilotSystem.startDash(game,first),true);
assert.equal(first.charges,2);
assert.equal(pilotSystem.startDash(game,first),false,'Dash cannot consume a second charge mid-flight');
pilotSystem.stepRemote(game,first,{dx:1,dy:0,aim:0},.03);
assert.ok(hit.some(h=>h.owner===first && h.source==='lan-ally'));
assert.equal(second.charges,3,'Second guest retains their own dash capacity');
second.dashUpgrades.dash_blast=1;
const nearby={x:second.x+40,y:second.y,hp:1000,radius:12,dead:false};
game.enemies.push(nearby);
assert.equal(pilotSystem.startDash(game,second),true);
assert.ok(hit.some(h=>h.owner===second),'Second pilot uses same authoritative dash damage');

third.invuln=0;
const initialHp=third.hp;
game.enemyBullets.push({x:third.x,y:third.y,radius:4,damage:12});
pilotSystem.resolveRemoteHits(game,third);
assert.equal(third.hp,initialHp-12);
assert.equal(game.enemyBullets.length,0);
assert.equal(third.invuln,.6);
third.hp=5;third.invuln=0;third.passives.armor=5;third.cheatDeathUsed=false;
game.enemyBullets.push({x:third.x,y:third.y,radius:4,damage:100});
pilotSystem.resolveRemoteHits(game,third);
assert.equal(third.hp,35);
assert.equal(third.cheatDeathUsed,true);
third.hp=1;third.invuln=0;
game.enemyBullets.push({x:third.x,y:third.y,radius:4,damage:100});
assert.equal(pilotSystem.resolveRemoteHits(game,third),true);
assert.equal(third.hp,0,'One-time cheat death cannot fire twice');
assert.equal(first.hp,100,'Other pilots remain alive');
console.log('Pilot system passed: three separate remote spawn/input/movement/dash/HP/collision and owner-specific damage paths.');
