/* Run: node tests/neon-survivor-spawn-branches.smoke.cjs
 *
 * spawnEnemyWave() picks the minion type with a single if/else chain over one
 * Math.random() roll. That makes any branch whose interval is already covered
 * by an earlier branch DEAD CODE — it compiles, it reads correctly, and it can
 * never run. That is exactly what happened to the sniper and shield_pylon
 * branches: they were tested after the charger (`r < 0.2`) and spitter
 * (`r < 0.35`) branches had already matched, so both types were unreachable and
 * never appeared as normal minions.
 *
 * This test pins two things:
 *   1. every branch is reachable, at a controlled roll, at a time it is unlocked;
 *   2. the bands stay disjoint and in the documented order, so a future edit
 *      cannot quietly re-shadow a branch.
 *
 * Section 3 additionally proves the two types spawn in a real run, which is the
 * player-visible symptom the original bug produced.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const sandbox = {
  window: { addEventListener() {} },
  document: { getElementById() { return null; }, addEventListener() {} },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 0 }, console,
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runCore(sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);

/* Math.random() is driven from a queue so a test can aim a specific roll at the
 * type-selection branch. Short-circuiting is respected: `t > 90 && Math.random()
 * < ...` does NOT consume a roll when t <= 90, so callers must only enqueue the
 * elite value when they actually want the elite gate evaluated.
 *
 * Spawned minions seed their own timers from Math.random() too (spitter/sniper
 * shootTimer, ...), and the count varies per type, so once the aimed rolls are
 * consumed the stub falls back to a neutral 0.5 rather than counting calls. */
const rolls = [];
sandbox.Math = Object.create(Math);
sandbox.Math.random = () => (rolls.length ? rolls.shift() : 0.5);
// My def() below re-aims the type roll, but the co-op cap helper reads window
// first; keep it absent so the solo 100 cap and eliteRate defaults apply.
delete sandbox.window.NeonLanEncounters;

/** A game whose only real logic is the branch chain under test. */
function makeGame(t) {
  const game = Object.create(proto);
  Object.assign(game, {
    enemies: [], enemyBullets: [], texts: [], shockwaves: [],
    survivalTime: t, difficulty: 0, width: 900, height: 600,
    player: { x: 0, y: 0, hp: 100, maxHp: 100, crystals: 0, level: 1, weapons: {}, passives: {} },
    getActiveSpawnPilot: () => ({ x: 0, y: 0 }),
    getNormalEnemyCount() { return this.enemies.length; },
    getAdaptiveScaling: () => 1,
    getDifficultyRules: () => ({ eliteRate: 1 })
  });
  return game;
}

/** Spawn exactly one minion at survival time `t` with the type roll pinned to `r`. */
function spawnWith(t, r) {
  const game = makeGame(t);
  rolls.length = 0;
  // Elite gate: only rolled once the 90s grace period is over, and 0.99 always
  // fails it (the ceiling is 0.07 * eliteRate * endlessMultiplier <= 0.07).
  if (t > 90) rolls.push(0.99);
  rolls.push(0.5);   // spawn angle — arbitrary
  rolls.push(r);     // the single roll the type chain branches on
  game.spawnEnemyWave();
  return game.enemies.map(e => e.type);
}

/** The one type produced for a given (t, r); asserts a minion was produced. */
function typeAt(t, r) {
  const types = spawnWith(t, r);
  assert.equal(types.length, 1, `expected exactly one spawn at t=${t} r=${r}, got ${types.length}`);
  return types[0];
}

// ---------------------------------------------------------------------------
// 1. Every branch is reachable — the regression this file exists for.
// ---------------------------------------------------------------------------
// Late game: all seven types are unlocked (kamikaze not capped), so every band
// must be individually addressable.
const LATE = 200;
assert.equal(typeAt(LATE, 0.10), 'charger', 'charger band [0,0.20)');
assert.equal(typeAt(LATE, 0.30), 'spitter', 'spitter band [0.20,0.35)');
assert.equal(typeAt(LATE, 0.37), 'kamikaze', 'kamikaze band [0.35,0.40)');
assert.equal(typeAt(LATE, 0.50), 'swarmer', 'swarmer band [0.40,0.65)');
assert.equal(typeAt(LATE, 0.68), 'shield_pylon', 'shield_pylon band [0.65,0.72)');
assert.equal(typeAt(LATE, 0.73), 'sniper', 'sniper band [0.72,0.75)');
assert.equal(typeAt(LATE, 0.90), 'drone', 'drone tail [0.75,1)');

// The exact two types the original chain shadowed. Assert them by name so the
// intent survives any later reshuffle of the surrounding bands.
assert.equal(typeAt(LATE, 0.70), 'shield_pylon',
  'shield_pylon must be reachable as a normal minion, not shadowed by spitter/charger');
assert.equal(typeAt(LATE, 0.74), 'sniper',
  'sniper must be reachable as a normal minion, not shadowed by spitter/charger');

// Band edges are half-open and must not overlap or leave a gap. The expected
// layout shrinks from the tail inward as each specialist unlocks.
for (const [t, edges] of [
  [200, [[0.0, 'charger'], [0.2, 'spitter'], [0.35, 'kamikaze'], [0.4, 'swarmer'],
         [0.65, 'shield_pylon'], [0.72, 'sniper'], [0.75, 'drone']]],
  [120, [[0.0, 'charger'], [0.2, 'spitter'], [0.35, 'kamikaze'], [0.4, 'swarmer'],
         [0.65, 'shield_pylon'], [0.72, 'drone']]],
  [110, [[0.0, 'charger'], [0.2, 'spitter'], [0.35, 'kamikaze'], [0.4, 'swarmer'],
         [0.65, 'shield_pylon'], [0.72, 'drone']]],
  [95,  [[0.0, 'charger'], [0.2, 'spitter'], [0.35, 'swarmer'], [0.65, 'drone']]],
  [50,  [[0.0, 'spitter'], [0.35, 'swarmer'], [0.65, 'drone']]],
  [30,  [[0.0, 'swarmer'], [0.65, 'drone']]],
  [10,  [[0.0, 'drone']]]
]) {
  for (const [r, expected] of edges) {
    assert.equal(typeAt(t, r), expected, `t=${t} r=${r} must be ${expected}`);
  }
}

// The unlocked-set is monotone: a type never appears before its time gate.
assert.equal(typeAt(20, 0.70), 'drone', 'shield_pylon is locked before 100s');
assert.equal(typeAt(120, 0.74), 'drone', 'sniper is locked before 130s');
assert.equal(typeAt(94, 0.37), 'swarmer', 'kamikaze is locked before 95s');

// ---------------------------------------------------------------------------
// 2. The kamikaze cap falls through to a legal minion instead of a gap.
// ---------------------------------------------------------------------------
{
  const game = makeGame(LATE);
  for (let i = 0; i < 6; i++) game.enemies.push({ type: 'kamikaze', dead: false });
  rolls.length = 0;
  rolls.push(0.99, 0.5, 0.37); // elite, angle, a roll that would be a kamikaze
  game.spawnEnemyWave();
  const spawned = game.enemies[6];
  assert.equal(spawned.type, 'swarmer',
    'a capped kamikaze roll must fall through to the swarmer band, not vanish or double-count');
}

// ---------------------------------------------------------------------------
// 3. End-to-end: both shadowed types actually spawn in a real sampled run.
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  // Walk the whole difficulty curve at 1s resolution with a deterministic PRNG,
  // which exercises the chain the way the game does rather than aim by hand.
  let seed = 20240611;
  const seeded = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let t = 0; t <= 400; t++) {
    for (let i = 0; i < 60; i++) {
      const game = makeGame(t);
      const originalRandom = sandbox.Math.random;
      sandbox.Math.random = seeded;
      try {
        game.spawnEnemyWave();
      } finally {
        sandbox.Math.random = originalRandom;
      }
      for (const e of game.enemies) seen.add(e.type);
    }
  }
  for (const type of ['drone', 'swarmer', 'charger', 'spitter', 'kamikaze', 'shield_pylon', 'sniper']) {
    assert.ok(seen.has(type),
      `${type} never spawned across a full 0-400s sweep — a spawn branch is unreachable`);
  }
}

console.log('neon-survivor spawn-branches smoke: ok');
