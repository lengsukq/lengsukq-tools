/* Run: node tests/neon-survivor-coop-balance.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const core = neonCore.coreSource();
const coop = fs.readFileSync(root + 'js/network/coop.js', 'utf8');
for (const name of ['coop-bosses', 'encounters', 'experience', 'coop'])
  assert.ok(html.includes('/js/network/' + name + '.js'), 'Missing module ' + name);
assert.match(core, /NeonLanExperience\?\.collector\(this, g\)/);
assert.match(core, /NeonLanExperience\?\.synchronizeLevel\(this\)/);
assert.match(core, /NeonLanEncounters\?\.scaleNewEnemies\(this\)/);
assert.match(coop, /teamXP: window\.NeonLanExperience\?\.progress\(game\)/);

const bossLabel = { textContent: '' };
const sandbox = {
  window: { addEventListener() {} }, console,
  document: { getElementById(id) { return id === 'boss-name' ? bossLabel : null; } },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 1000 }, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['network/schema','network/experience','network/coop-bosses','network/encounters','network/coop']);
const { NeonLanExperience: xp, NeonLanEncounters: encounters, NeonLanCoop } = sandbox.window;
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const host = {
  x:0,y:0,hp:100,maxHp:100,radius:16,level:1,xp:0,xpNeeded:51,
  magnetRadius:120, passives:{},weapons:{blaster:1},dmgMultiplier:1,critRate:0,critDmg:2,crystals:0
};
const ally = { x:250,y:0,hp:100,maxHp:100,radius:16,level:1 };
const game = Object.create(proto);
Object.assign(game, {
  player:host, lanCoop:{ ally,rtc:{connected:true,role:'host'} },
  enemies:[],gems:[],texts:[],particles:[],shockwaves:[],enemyBullets:[],
  survivalTime:180,bossCycle:0,difficulty:0,width:1000,height:800,state:'playing',
  sound:{playBossAlert(){},playGemPickup(){}},
  getAdaptiveScaling:()=>1,
  getDifficultyRules:()=>({enemyCount:1,eliteRate:1,normalDrops:1,enemyDamage:1}),
  recalculateMoveSpeed(){},recalculateDashStats(){},updateHUD(){},
  triggerLevelUp(){ this.state='levelup'; }
});
assert.equal(xp.active(game), true);
assert.equal(xp.collector(game,{x:230,y:0}),ally,'Guest can collect a team gem');
assert.equal(xp.collector(game,{x:10,y:0}),host);
game.gems=[
  {x:-900,y:0,type:'gem',value:10},
  {x:900,y:0,type:'gem',value:10},
  {x:5,y:0,type:'heal'},
  {x:10,y:0,type:'nuke'}
];
assert.equal(xp.activateMapMagnet(game),2);
assert.deepEqual(game.gems.map(g=>Boolean(g.magnetized)),[true,true,false,false]);
game.gainXP(70);
assert.equal(host.level,2);
assert.equal(ally.level,2);
assert.equal(host.xp,ally.xp);
assert.equal(host.xpNeeded,ally.xpNeeded);
assert.equal(host.crystals,1,'XP pickup gives exactly one crystal');
const frame=NeonLanCoop.snapshot(game,ally,8);
assert.equal(frame.teamXP.level,2);
assert.equal(frame.teamXP.xp,host.xp);
assert.equal(frame.guest.level,frame.host.level);
assert.equal(NeonLanCoop.safeSnapshot(frame),true);

game.enemies=[
  {type:'swarmer',hp:100,maxHp:100},
  {type:'charger',isElite:true,hp:200,maxHp:200},
  {type:'boss_nexus',isBoss:true,hp:1000,maxHp:1000}
];
encounters.scaleNewEnemies(game);
assert.deepEqual(game.enemies.map(e=>e.hp),[135,290,1650]);
encounters.scaleNewEnemies(game);
assert.deepEqual(game.enemies.map(e=>e.hp),[135,290,1650],'No repeated enemy scaling');
game.lanCoop.rtc.connected=false;
game.enemies.push({hp:100,maxHp:100});
encounters.scaleNewEnemies(game);
assert.equal(game.enemies[3].hp,100,'Single-player unaffected');
game.lanCoop.rtc.connected=true;

const boss=encounters.createDualBoss(game,0,0,1,1);
assert.equal(boss.type,'boss_dual_reactor');
assert.equal(encounters.modifyBossDamage(game,boss,100),45);
host.x=-185;host.y=-20;ally.x=185;ally.y=20;
assert.equal(encounters.captureStatus(game,boss).both,true);
encounters.updateBoss(game,boss,.7);
assert.equal(boss.coopExposed,0);
encounters.updateBoss(game,boss,.8);
assert.equal(boss.coopExposed,9);
assert.equal(encounters.modifyBossDamage(game,boss,100),125);
host.x=500;ally.x=-500;
encounters.updateBoss(game,boss,9);
assert.equal(boss.coopExposed,0);
assert.equal(encounters.modifyBossDamage(game,boss,100),45);
game.player.crystals=0;
encounters.bonusOnVictory(game,boss);
assert.equal(game.player.crystals,35);
game.lanCoop.rtc.connected=false;
assert.equal(encounters.modifyBossDamage(game,boss,100),100);

// ---------------------------------------------------------------------------
// Party scaling: the QUANTITY axis.
//
// Enemy HP alone made a bigger party EASIER. Team damage grows ~x4 while enemy
// HP grows ~x2, and the normal-enemy ceiling used to be 100 for every party
// size, so a four-pilot room met the same crowd as a solo run while killing it
// four times faster. The ceiling, the spawn cadence and the swarm size now all
// follow the party, and they follow the SAME input as the HP curve, so the two
// cannot drift apart.
// ---------------------------------------------------------------------------
const near = (actual, expected, what) =>
  assert.ok(Math.abs(actual - expected) < 1e-6,
    `${what}: expected ${expected}, got ${actual}`);

/** A host world with `guests` seats, of which `connected` are online. */
function partyGame(guests, connected = guests) {
  const allies = new Map();
  for (let i = 0; i < guests; i++) {
    const id = ['guest', 'guest-2', 'guest-3'][i];
    allies.set(id, { id, hp: 100, maxHp: 100, downed: false, disconnected: i >= connected });
  }
  return Object.assign(Object.create(proto), {
    player: { hp: 100, level: 1, weapons: {}, passives: {}, dmgMultiplier: 1 },
    enemies: [], texts: [], shockwaves: [], enemyBullets: [], bossCycle: 0,
    lanCoop: { allies, ally: allies.get('guest') || null,
      rtc: { connected: true, role: 'host' } }
  });
}
const soloGame = Object.assign(Object.create(proto), {
  player: { hp: 100, level: 1, weapons: {}, passives: {}, dmgMultiplier: 1 },
  enemies: [], texts: [], shockwaves: [], enemyBullets: [], bossCycle: 0, lanCoop: null
});

// --- solo is untouched: every co-op multiplier must be exactly 1 ------------
assert.equal(encounters.active(soloGame), false);
assert.equal(encounters.partyScale(soloGame), 1, 'solo has no party scaling');
assert.equal(encounters.normalEnemyCap(soloGame), 100, 'solo keeps the original ceiling');
assert.equal(encounters.spawnIntervalScale(soloGame), 1, 'solo spawn cadence is untouched');
assert.equal(encounters.swarmCount(soloGame, 20), 20, 'solo swarm size is untouched');

// --- the ceiling grows by exactly 30 per additional pilot -------------------
const CEILINGS = [[1, 130], [2, 160], [3, 190]];
for (const [guests, ceiling] of CEILINGS) {
  assert.equal(encounters.normalEnemyCap(partyGame(guests)), ceiling,
    `${guests + 1} pilots must cap normal enemies at ${ceiling}`);
}

// --- and the cadence and swarm size follow the same coefficient -------------
near(encounters.spawnIntervalScale(partyGame(1)), 0.9 / 1.3, 'two-pilot spawn cadence');
near(encounters.spawnIntervalScale(partyGame(2)), 0.9 / 1.6, 'three-pilot spawn cadence');
near(encounters.spawnIntervalScale(partyGame(3)), 0.9 / 1.9, 'four-pilot spawn cadence');
assert.equal(encounters.swarmCount(partyGame(1), 20), 26, 'two-pilot swarm');
assert.equal(encounters.swarmCount(partyGame(2), 20), 32, 'three-pilot swarm');
assert.equal(encounters.swarmCount(partyGame(3), 20), 38, 'four-pilot swarm');
// A scaled spawn cadence must stay well under the solo interval, otherwise the
// raised ceiling could never actually fill.
assert.ok(encounters.spawnIntervalScale(partyGame(3)) < 0.5,
  'a four-pilot room must spawn at more than twice the solo rate');

// --- a disconnect falls back to the pilots still online --------------------
assert.equal(encounters.normalEnemyCap(partyGame(3, 2)), 160,
  'a four-seat room with one guest gone must run the three-pilot ceiling');
assert.equal(encounters.normalEnemyCap(partyGame(3, 1)), 130,
  'and with two gone, the two-pilot ceiling');
assert.equal(encounters.connectedGuests(partyGame(3, 1)), 1,
  'only connected guests count');

// --- the HP curve is deliberately unchanged: quantity carries the rest -----
// 1.35 / 1.45 / 1.65 by kind, times (1 + 0.27 per guest BEYOND the first), so
// a two-pilot room is exactly the originally documented x1.35/x1.45/x1.65.
for (const [guests, party] of [[1, 1.00], [2, 1.27], [3, 1.54]]) {
  const world = partyGame(guests);
  world.enemies = [
    { type: 'drone', hp: 1000, maxHp: 1000 },
    { type: 'charger', isElite: true, hp: 1000, maxHp: 1000 },
    { type: 'boss_nexus', isBoss: true, hp: 1000, maxHp: 1000 }
  ];
  encounters.scaleNewEnemies(world);
  const label = `${guests + 1}-pilot`;
  // scaleNewEnemies rounds the result, so the expectation has to round too.
  near(world.enemies[0].hp, Math.round(1000 * 1.35 * party), `${label} normal HP`);
  near(world.enemies[1].hp, Math.round(1000 * 1.45 * party), `${label} elite HP`);
  near(world.enemies[2].hp, Math.round(1000 * 1.65 * party), `${label} boss HP`);
}

console.log('Co-op balance passed: shared XP, map magnet, level sync, one-time '
  + 'enemy scaling, dual-reactor cooperative shield, and party-scaled enemy '
  + 'quantity (100/130/160/190) with an unchanged HP curve.');
