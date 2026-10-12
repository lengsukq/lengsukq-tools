/* Run: node tests/neon-survivor-astra-arsenal.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const env = { window: {}, console };
vm.createContext(env);
for (const name of ['ships','ships.generated']) {
  vm.runInContext(fs.readFileSync(root + name + '.js','utf8'), env);
}
const a = env.window.NeonAstra, lib = env.window.NeonAstraArsenal;
assert.equal(a.catalog.length, 24);
assert.equal(Object.keys(lib.WEAPONS).length, 8);
assert.equal(env.window.NeonShips.get('astra').playable, true,
  'Astra is available after class abilities and authoritative actions are wired');
function makePilot() {
  return { shipId:'astra', hp:95, maxHp:95, level:10,
    x:0,y:0,passives:{},weapons:{star_weave:1},dashUpgrades:{},
    dmgMultiplier:1,cdrMultiplier:1, invulnTimer:0 };
}
const pilot = makePilot();
const hits = [];
const enemies = Array.from({length:60}, (_,i)=>({
  x:30+(i%10)*20, y:-45+Math.floor(i/10)*20,
  hp:4000, maxHp:4000, radius:10, damage:14, freezeTimer:0
}));
const game = { state:'playing',player:pilot, survivalTime:0,
  enemies,shockwaves:[],texts:[],
  dealDamage(enemy,damage,source,crit,owner) {
    assert.equal(owner,pilot);
    assert.ok(Number.isFinite(damage)&&damage>0);
    hits.push({enemy,damage,source});
    enemy.hp-=damage;
  }};
for (const [id] of a.catalog.filter(card=>card.type==='passive').map(c=>[c.id])) {
  assert.equal(lib.upgrade(pilot,{id,type:'passive',shipId:'astra'}),true,id);
}
assert.equal(Object.keys(pilot.passives).length,8);
assert.equal(lib.modifiers(pilot).maxMana,120);
assert.ok(lib.modifiers(pilot).manaRegen>2);
assert.ok(lib.modifiers(pilot).cooldownFactor<1);
assert.ok(lib.modifiers(pilot).areaFactor>1);
assert.equal(lib.upgrade(pilot,{id:'power',type:'passive',shipId:'riftblade'}),false);
assert.equal(lib.upgrade(pilot,{id:'star_talisman',type:'weapon',shipId:'astra'}),false);
assert.equal(a.state(pilot).maxMana,120);
for (const id of Object.keys(lib.WEAPONS)) {
  const isolated=makePilot();
  isolated.weapons={[id]:5};
  isolated.passives={ star_mark_hunt:2, glyph_extent:2 };
  const world={...game,player:isolated,shockwaves:[],survivalTime:0,
    dealDamage(enemy,damage,source,crit,owner) {
      assert.equal(owner,isolated);
      hits.push({enemy,damage,source});
      enemy.hp-=damage;
    }};
  const count=hits.length;
  for(let j=1;j<=18;j++) {
    world.survivalTime=j*.5;
    lib.tick(isolated,world,.5);
  }
  const localHits=hits.slice(count);
  assert.ok(localHits.length>0,id+' must actually damage enemies');
  assert.ok(localHits.every(h=>h.source.startsWith('astra_')),id+' should use class-specific sources');
  assert.ok(lib.state(isolated).pending.length<=16,'Scheduled events are bounded');
}
// Protected damage may retaliate only with the shield-refraction passive.
pilot.passives.shield_refraction=5;
game.survivalTime=20;
const previous=hits.length;
assert.equal(a.cast(pilot,game,'ward'),true);
assert.equal(a.incomingDamage(game,pilot,40)<40,true);
assert.ok(hits.length>previous,'Guarding with shield refraction counters once');
const count=hits.length;
a.incomingDamage(game,pilot,40);
assert.equal(hits.length,count,'Refraction obeys its internal cooldown');
// Both active spells share mana; the legendary triggers independently on a
// valid meteor hit, has an internal cooldown and never requires spell toggling.
a.state(pilot).mana=120;
a.state(pilot).cooldowns.meteor=0;
const before=hits.length;
assert.equal(a.cast(pilot,game,'meteor'),true);
assert.ok(hits.length>before);
const s=lib.state(pilot);
assert.ok(hits.some(h=>h.source==='astra_star_echo'));
assert.ok(pilot.astraTempShield?.value>=12);
assert.equal(a.state(pilot).resonanceReadyAt,game.survivalTime+9);
const echoes=hits.filter(h=>h.source==='astra_star_echo').length;
assert.equal(a.cast(pilot,game,'meteor'),true);
assert.equal(hits.filter(h=>h.source==='astra_star_echo').length,echoes,'No echo farming during cooldown');
game.survivalTime+=9;
assert.equal(a.cast(pilot,game,'meteor'),true);
assert.ok(hits.filter(h=>h.source==='astra_star_echo').length>echoes);
// All seven alternate warp cards remain independently obtainable.
for (const card of a.catalog.filter(c=>c.type==='dash')) {
  assert.equal(lib.upgrade(pilot,card),true,card.id);
}
assert.equal(Object.keys(pilot.dashUpgrades).length,7);
assert.equal(a.state(pilot).warpUpgrades.star_gate,1);
assert.equal(a.state(pilot).warpUpgrades.phase_self_guard,1);
a.finishWard(pilot,game);
game.survivalTime=31;
const oldX=pilot.x;
assert.equal(a.blink(pilot,game,{x:1,y:0},31),true);
assert.equal(pilot.x-oldX,160);
assert.ok(a.state(pilot).phaseVeilRemaining>0);
assert.ok(pilot.astraTempShield?.value>0);
assert.equal(s.mirrorEchoPending,true);
// Timer accumulation and combat strictly stop while paused.
game.state='levelup';
const previousHits=hits.length;
lib.tick(pilot,game,30);
assert.equal(hits.length,previousHits);
assert.equal(lib.upgrade({shipId:'riftblade',hp:100},a.catalog[0]),false);
console.log('Astra arsenal passed: 8 distinct spell weapons, 8 live passives, 7 phase cards, bounded timers and combat hooks.');
