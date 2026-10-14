/* Run: node tests/neon-survivor-entity-caps.smoke.cjs
 *
 * Long endless runs could accumulate hundreds of live enemy projectiles: every
 * boss barrage pushed raw, and every live bullet is walked again by collision,
 * rendering and the co-op snapshot projection. All enemy barrages in the
 * simulation now go through the capped spawnEnemyBullet helper, the two
 * weapon paths that bypassed the particle budget are budgeted, and canvas
 * shadow blur is switchable so low-effects mode can drop it.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
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

// --- the default ceiling holds ---
const game = Object.create(proto);
game.enemyBullets = [];
for (let i = 0; i < 300; i++) game.spawnEnemyBullet({ x: i });
assert.equal(game.enemyBullets.length, 240, 'default cap is 240 live enemy bullets');
assert.equal(game.spawnEnemyBullet({ x: 999 }), null, 'the bullet past the cap must be dropped');
assert.equal(game.enemyBullets.length, 240, 'a dropped bullet must not be queued');

// --- the ceiling is overridable and the array is created defensively ---
const custom = Object.create(proto);
custom.enemyBullets = [];
custom.maxEnemyBullets = 5;
for (let i = 0; i < 20; i++) custom.spawnEnemyBullet({ x: i });
assert.equal(custom.enemyBullets.length, 5, 'maxEnemyBullets must be honoured');

const fresh = Object.create(proto);
fresh.spawnEnemyBullet({ x: 1 });
assert.equal(fresh.enemyBullets.length, 1, 'a missing array must be created, not thrown on');
assert.equal(fresh.spawnEnemyBullet({ x: 2 }).x, 2, 'the accepted bullet is returned');

// --- every simulated barrage goes through the capped helper ---
const enemiesSource = fs.readFileSync(neonCore.ROOT + '/js/core/simulation/enemies.js', 'utf8');
assert.equal(/this\.enemyBullets\.push\(/.test(enemiesSource), false,
  'the simulation must not push raw enemy bullets past the cap');
assert.ok((enemiesSource.match(/this\.spawnEnemyBullet\(/g) || []).length >= 8,
  'every barrage site must use spawnEnemyBullet');

// --- the two weapon paths that bypassed the particle budget ---
const firingSource = fs.readFileSync(neonCore.ROOT + '/js/core/combat/firing.js', 'utf8');
const guards = firingSource.match(/this\.particles\.length < \(this\.fxLow \? 15 : 45\)/g) || [];
assert.ok(guards.length >= 2,
  `tesla chains and laser sparks must respect the particle budget, found ${guards.length} guards`);

// --- canvas shadow blur is switchable ---
assert.equal(typeof proto.shadowEnabled, 'function', 'shadowEnabled must stay on the prototype');
const shadow = Object.create(proto);
assert.equal(shadow.shadowEnabled(), true, 'shadow blur defaults on for callers without settings');
shadow.fxShadow = true;
assert.equal(shadow.shadowEnabled(), true);
shadow.fxShadow = false;
assert.equal(shadow.shadowEnabled(), false, 'low-effects mode must drop shadow blur');

// Every blurred draw site must consult the gate.
for (const file of ['js/core/render/world.js', 'js/core/render/fighter.js', 'js/core/render/effects.js']) {
  const source = fs.readFileSync(neonCore.ROOT + '/' + file, 'utf8');
  const blurs = (source.match(/ctx\.shadowBlur\s*=/g) || []).length;
  const gates = (source.match(/shadowEnabled\(\)/g) || []).length;
  assert.ok(blurs > 0, `${file} should still draw shadows when enabled`);
  assert.ok(gates >= blurs,
    `${file} sets shadowBlur ${blurs} times but only gates ${gates} of them`);
}

console.log('Entity caps passed: capped enemy barrages, budgeted particles, switchable shadow blur.');
