/* Run: node tests/neon-survivor-phantom-scythe.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');

assert.ok(html.includes('js/ships.generated.js'));
assert.ok(html.indexOf('js/ships.generated.js') < html.indexOf('js/core.js'));

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'js/ships/phantom/abilities.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(root + 'js/ships/phantom/weapons.js', 'utf8'), ctx);
const scythe = ctx.window.NeonPhantomScythe;
const phantom = ctx.window.NeonPhantom;

const createPilot = level => ({
  shipId: 'phantom', x: 0, y: 0, hp: 85, dmgMultiplier: 1,
  cdrMultiplier: 1, weapons: { phantom_scythe: level }
});

const pilot = createPilot(1);
const hits = [];
const game = {
  state: 'playing', survivalTime: 0, shockwaves: [],
  enemies: [
    { x: 100, y: 0, hp: 1000, dead: false },
    { x: 200, y: 0, hp: 1000, dead: false }
  ],
  dealDamage(enemy, damage, source, crit, owner) {
    assert.equal(owner, pilot);
    hits.push({ enemy, damage, source, crit });
    enemy.hp -= damage;
  }
};

// Tick to trigger fire
scythe.tick(pilot, game, 2.0);
const s = scythe.state(pilot);
assert.equal(s.scythes.length, 2, 'Lv1 spawns 2 scythes');

// Advance scythe outward flight to hit enemy
scythe.tick(pilot, game, 0.4);
assert.ok(hits.some(h => h.source === 'phantom_scythe_out'), 'Outward flight deals damage');

// Advance through hover and return phases
for (let step = 0; step < 15; step++) {
  game.survivalTime += 0.2;
  scythe.tick(pilot, game, 0.2);
}

// Scythes should return and be absorbed
assert.ok(hits.some(h => h.source === 'phantom_scythe_hover' || h.source === 'phantom_scythe_return'));
assert.ok(pilot.phantom.ectoplasm > 0, 'Reabsorbing scythes grants ectoplasm');

// Test Lv5 harvest burst on reabsorb
const master = createPilot(5);
const masterHits = [];
const masterGame = {
  state: 'playing', survivalTime: 10, shockwaves: [],
  enemies: [
    { x: 30, y: 0, hp: 1000, dead: false }
  ],
  dealDamage(enemy, damage, source, crit, owner) {
    masterHits.push({ enemy, damage, source, crit });
  }
};

// Spawn a scythe at origin returning directly to pilot
const sc = scythe.spawnScythe(master, 0, 5);
sc.phase = 'return';
sc.x = 10;
sc.y = 0;
scythe.tick(master, masterGame, 0.1);

assert.ok(masterHits.some(h => h.source === 'phantom_scythe_burst'), 'Lv5 triggers burst on return');

// Pause and downed test
const prevCount = masterHits.length;
masterGame.state = 'paused';
scythe.tick(master, masterGame, 10.0);
assert.equal(masterHits.length, prevCount, 'Paused game does not tick scythes');

masterGame.state = 'playing';
master.hp = 0;
scythe.tick(master, masterGame, 10.0);
assert.equal(masterHits.length, prevCount, 'Downed pilot does not tick scythes');

console.log('Phantom Scythe passed: 5-rank boomerang scythe, hover ticks, return reabsorption and burst.');
