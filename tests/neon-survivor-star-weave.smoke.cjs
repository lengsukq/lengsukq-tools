/* Run: node tests/neon-survivor-star-weave.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'ships/astra/weapons.js', 'utf8'), ctx);
const weave = ctx.window.NeonAstraWeave;
const createPilot = level => ({
  shipId: 'astra', x: 0, y: 0, hp: 95, dmgMultiplier: 1,
  cdrMultiplier: 1, weapons: { star_weave: level }
});
const pilot = createPilot(5);
const hits = [];
const energy = [];
ctx.window.NeonAstra = { regenOnHit: (_, enemy) => energy.push(enemy) };
const enemies = Array.from({ length: 30 }, (_, i) =>
  ({ x: 90 + i % 6 * 9, y: -20 + Math.floor(i / 6) * 9,
    hp: 3000, radius: 10, dead: false }));
const game = { enemies, state: 'playing', survivalTime: 0, shockwaves: [],
  dealDamage(enemy, amount, source, critical, actor) {
    assert.equal(actor, pilot);
    assert.ok(amount > 0);
    enemy.hp -= amount;
    hits.push({ enemy, source, amount });
  } };
for (let i = 1; i <= 22; i++) {
  game.survivalTime = i * .6;
  weave.tick(pilot, game, .6);
}
const s = weave.state(pilot);
assert.equal(s.anchors.length, 3, 'Lv5 uses at most three anchors');
assert.ok(hits.some(h => h.source === 'astra_weave_bolt'), 'Signature weapon shoots targets');
assert.ok(hits.some(h => h.source === 'astra_weave_link'), 'Anchor network damages nearby enemies');
assert.ok(hits.some(h => h.source === 'astra_weave_burst'), 'Lv5 forms a network burst');
assert.ok(hits.filter(h => h.source === 'astra_weave_burst').length <= 36,
  'Lv5 burst has an independent six-second cooldown and 12-target budget');
assert.ok(energy.length > 0);
assert.ok(energy.length <= hits.filter(h => h.source !== 'astra_weave_burst').length,
  'Explosion cannot recursively recover mana');
const previous = hits.length;
game.state = 'levelup';
weave.tick(pilot, game, 30);
assert.equal(hits.length, previous, 'Upgrade modal freezes weapon ticks');
game.state = 'playing';
pilot.hp = 0;
weave.tick(pilot, game, 30);
assert.equal(hits.length, previous, 'Downed heroes cannot cast');

const novice = createPilot(1);
const training = { ...game, dealDamage() {} };
for (let i = 1; i <= 20; i++) {
  training.survivalTime = i * .7;
  weave.tick(novice, training, .7);
}
assert.equal(weave.state(novice).anchors.length, 2, 'Lv1 has exactly two active anchors');
assert.ok(!weave.state({ shipId: 'riftblade' }), 'Other classes have no mana-star network');
assert.equal(weave.linkedPairs(weave.state(novice).anchors).length, 1);
assert.equal(weave.segmentDistanceSq(8, 4, {x:0,y:0}, {x:10,y:0}), 16);
console.log('Astra Star Weave passed: five-rank anchored weapon, link damage, capped burst, pause and ownership.');
