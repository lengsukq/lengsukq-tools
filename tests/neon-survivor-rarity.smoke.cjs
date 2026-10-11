/* Run: node tests/neon-survivor-rarity.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.indexOf('js/rarity.js') < html.indexOf('js/endless.js'));
assert.ok(html.indexOf('js/rarity.js') < html.indexOf('js/core.js'));
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + 'js/rarity.js', 'utf8'), sandbox);
const { pick, weights } = sandbox.window.NeonUpgradeRarity;
const beginning = weights(0), harder = weights(6);
assert.equal(beginning.common, 60);
assert.equal(beginning.rare, 28);
assert.equal(beginning.legendary, 12);
assert.equal(harder.common, 60);
assert.ok(harder.rare < beginning.rare && harder.rare > 0);
assert.ok(harder.legendary < beginning.legendary && harder.legendary > 0);
for (let difficulty = 0; difficulty < 6; difficulty++) {
  const now = weights(difficulty), next = weights(difficulty + 1);
  assert.ok(next.rare <= now.rare);
  assert.ok(next.legendary <= now.legendary);
}
const trio = ['common', 'rare', 'legendary'].map(id => ({ id, rarity: id }));
assert.equal(pick(trio, 3, 0, () => 0).length, 3);
assert.equal(pick(trio, 1, 0, () => 0)[0].id, 'common');
assert.equal(pick(trio, 1, 0, () => .999)[0].id, 'legendary');
assert.equal(new Set(pick(trio, 3, 6, () => 0).map(v => v.id)).size, 3);
assert.equal(pick([trio[2]], 3, 6, () => 0)[0].rarity, 'legendary',
  'High ascension must not ban the last eligible legendary option');
function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function distribution(difficulty) {
  const rng = seeded(987654);
  const hits = { common: 0, rare: 0, legendary: 0 };
  for (let i = 0; i < 30000; i++) hits[pick(trio, 1, difficulty, rng)[0].rarity]++;
  return hits;
}
const normal = distribution(0), max = distribution(6);
assert.ok(normal.legendary > max.legendary * 1.5,
  'Legendary selection frequency should drop noticeably at Ascension VI');
assert.ok(normal.rare > max.rare,
  'Rare selection frequency should drop at Ascension VI');
assert.ok(max.common > normal.common,
  'Common cards become relatively more frequent');
// Endless and co-op must call the SAME weights, rather than diverging.
const core = fs.readFileSync(root + 'js/core.js', 'utf8');
const endless = fs.readFileSync(root + 'js/endless.js', 'utf8');
assert.match(core, /NeonUpgradeRarity\?\.pickForPilot\(/);
assert.match(endless, /NeonUpgradeRarity\?\.pick\(eligible, count, difficulty, random\)/);
console.log('Upgrade rarity passed: weighted unique rolls, ascension scaling, no hard ban and deterministic frequency checks.');
