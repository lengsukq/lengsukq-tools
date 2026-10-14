/* Run: node tests/neon-survivor-vec-perf.smoke.cjs
 *
 * Vec.dist is called from every collision, AOE, pickup and targeting loop.
 * It used Math.hypot, which is several times slower than sqrt on mobile JS
 * engines. distSq was added so pure radius comparisons can skip the sqrt
 * entirely. This pins both the values and the hot-path usage.
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

const evalIn = expr => vm.runInContext(expr, sandbox);

// --- distSq is exactly the square of dist ---
const CASES = [
  [0, 0, 0, 0], [0, 0, 3, 4], [10, -5, -7, 8],
  [-100.5, 20.25, 3.75, -9.5], [1e4, -1e4, 1e4 + 3, 1e4 - 4],
  [0.1, 0.2, -0.3, -0.4]
];
for (const [x1, y1, x2, y2] of CASES) {
  const d = evalIn(`Vec.dist(${x1}, ${y1}, ${x2}, ${y2})`);
  const dSq = evalIn(`Vec.distSq(${x1}, ${y1}, ${x2}, ${y2})`);
  assert.ok(Number.isFinite(d) && Number.isFinite(dSq),
    `dist/distSq must stay finite for ${[x1, y1, x2, y2]}`);
  assert.ok(Math.abs(dSq - d * d) <= 1e-6 * Math.max(1, d * d),
    `distSq must equal dist^2 for ${[x1, y1, x2, y2]}`);
}

// --- exact known values (guards against a silent formula change) ---
assert.equal(evalIn('Vec.dist(0, 0, 3, 4)'), 5);
assert.equal(evalIn('Vec.distSq(0, 0, 3, 4)'), 25);
assert.equal(evalIn('Vec.dist(-3, -4, 0, 0)'), 5);
assert.equal(evalIn('Vec.distSq(1, 1, 1, 1)'), 0);

// --- Math.hypot is gone from the shared helper and every core call site ---
// Match a call, not a mention: the Vec.dist comment explains why hypot is gone.
const coreSource = neonCore.coreSource();
assert.equal(/Math\.hypot\s*\(/.test(coreSource), false,
  'the core must not call Math.hypot in a per-frame path');

// --- the per-entity hot loops compare squared distances ---
for (const [file, pattern] of [
  ['js/core/simulation/bullets.js', /Vec\.distSq\(b\.x, b\.y, e\.x, e\.y\)/],
  ['js/core/simulation/enemies.js', /Vec\.distSq\(e\.x, e\.y, this\.player\.x, this\.player\.y\)/],
  ['js/core/simulation/weapons.js', /Vec\.distSq\(ox, oy, e\.x, e\.y\)/],
  ['js/core/simulation/effects.js', /Vec\.distSq\(e\.x, e\.y, px, py\)/]
]) {
  const source = fs.readFileSync(neonCore.ROOT + '/' + file, 'utf8');
  assert.match(source, pattern, `${file} must use the squared-distance helper`);
}

console.log('Vec performance passed: sqrt helper, exact distSq equivalence, hot loops on squared distance.');
