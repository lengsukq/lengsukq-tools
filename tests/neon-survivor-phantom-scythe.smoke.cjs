/* Run: node tests/neon-survivor-phantom-scythe.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');

assert.ok(html.includes('js/ships.generated.js'));
assert.ok(html.indexOf('js/ships.generated.js') < html.indexOf(neonCore.coreScriptPaths()[0]));

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'js/ships/phantom/abilities.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(root + 'js/ships/phantom/weapons.js', 'utf8'), ctx);
const scythe = ctx.window.NeonPhantomScythe;
const phantom = ctx.window.NeonPhantom;

const createPilot = level => ({
  shipId: 'phantom', x: 0, y: 0, hp: 92, dmgMultiplier: 1,
  cdrMultiplier: 1, weapons: { phantom_scythe: level }
});

const pilot = createPilot(1);
const hits = [];
const game = {
  state: 'playing', survivalTime: 0, shockwaves: [],
  enemies: [
    { x: 80, y: 0, hp: 1000, dead: false },
    { x: 120, y: 0, hp: 1000, dead: false }
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
assert.ok(s.orbs.length >= 1, 'Lv1 fires soul orb');

// Advance orb flight to hit first enemy
scythe.tick(pilot, game, 0.25);
assert.ok(hits.some(h => h.source === 'phantom_orb_impact'), 'Flight impact deals damage on contact');
const orb = s.orbs[0];
assert.equal(orb.phase, 'locked', 'Locks onto first enemy');
assert.equal(orb.target, game.enemies[0]);
assert.ok(orb.lockRemaining <= 3.0, 'Locked for 3.0s duration');

// Advance through continuous decay and aura pulse
for (let step = 0; step < 8; step++) {
  game.survivalTime += 0.3;
  scythe.tick(pilot, game, 0.3);
}

// Target took continuous decay damage, and nearby enemy took aura AoE damage
assert.ok(hits.some(h => h.source === 'phantom_orb_decay'), 'Locked target takes continuous decay damage');
assert.ok(hits.some(h => h.source === 'phantom_orb_aura'), 'Nearby enemies take pulsating aura ring damage');
assert.ok(game.enemies[1].freezeTimer > 0, 'Aura ring slows nearby enemies');

// Test Lv5 final detonation
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

const orb5 = scythe.spawnOrb(master, masterGame.enemies[0], 5);
orb5.phase = 'locked';
orb5.target = masterGame.enemies[0];
orb5.lockRemaining = 0.05; // About to expire
scythe.tick(master, masterGame, 0.1);

assert.ok(masterHits.some(h => h.source === 'phantom_orb_detonate'), 'Lv5 triggers final void burst on lock expiration');

// Pause and downed test
const prevCount = masterHits.length;
masterGame.state = 'paused';
scythe.tick(master, masterGame, 10.0);
assert.equal(masterHits.length, prevCount, 'Paused game does not tick orbs');

masterGame.state = 'playing';
master.hp = 0;
scythe.tick(master, masterGame, 10.0);
assert.equal(masterHits.length, prevCount, 'Downed pilot does not tick orbs');

console.log('Phantom Soul Orb passed: locking 3.0s, continuous decay, aura ring slow/damage, and Lv5 void detonation.');
