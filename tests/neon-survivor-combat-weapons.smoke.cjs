/* Run: node tests/neon-survivor-combat-weapons.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.indexOf('js/combat/weapons.js') > 0);
assert.ok(html.indexOf('js/combat/weapons.js') < html.indexOf('js/network/coop.js'));
assert.ok(html.indexOf('js/combat/weapons.js') < html.indexOf('js/core.js'));
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(root + 'js/combat/weapons.js', 'utf8'), context);
const engine = context.window.NeonWeaponSystem;
const baseline = {
  blaster: [.35, .05, .12], tesla: [2, .25, .6],
  missiles: [2.4, .3, .8], nova: [5, .6, 2],
  laser: [2, .28, .65], blackhole: [5.5, .6, 2.4],
  cryomine: [3, .35, 1.2]
};
for (const [id, [base, step, min]] of Object.entries(baseline)) {
  for (const lvl of [1, 2, 5, 20]) {
    for (const cdr of [.45, 1, 1.3]) {
      const expected = Math.max(min, base - (lvl - 1) * step) * cdr;
      assert.ok(Math.abs(engine.cooldown(id, lvl, cdr) - expected) < 1e-10,
        `${id} lvl${lvl} preserves solo firing interval`);
    }
  }
}
assert.equal(engine.cooldown('__proto__', 1), null);
assert.equal(engine.cooldown('blaster', 0), null);
assert.equal(engine.cooldown('blaster', 1, Infinity), null);
const timers = {};
assert.equal(engine.tick(timers, 'blaster', 1, 1, .2), false);
assert.equal(engine.tick(timers, 'blaster', 1, 1, .15), true);
assert.equal(timers.blaster, 0);
assert.equal(engine.tick(timers, 'blaster', 1, 1, 0), false);

const hits = [];
const game = {
  player: { id: 'host', hp: 100, weapons: { blaster: 1 }, timers: {}, cdrMultiplier: 1 },
  bullets: [], blackHoles: [], mines: [], laserBeams: [], enemyBullets: [],
  dealDamage(enemy, amount, kind, critical, attacker) {
    hits.push({ amount, kind, attacker });
  },
  fireBlaster(level) {
    this.bullets.push({ x: 0, damage: level * 10 });
    this.dealDamage({}, level * 10, 'blaster', false);
  },
  fireLaser(level) {
    this.laserBeams.push({ damage: level * 20 });
    this.dealDamage({}, level * 20, 'laser', false);
  }
};
const guests = [1,2,3].map(i => ({
  id: `guest-${i}`, hp: 100, level: 1,
  weapons: { blaster: 2, laser: 1 }, timers: {},
  cdrMultiplier: 1, x: i * 30, y: 0
}));
for (const pilot of guests) {
  assert.equal(engine.update(game, pilot, 2.5), 2);
}
assert.equal(game.bullets.length, 3);
assert.equal(game.laserBeams.length, 3);
for (let i = 0; i < 3; i++) {
  assert.equal(game.bullets[i].ownerId, guests[i].id);
  assert.equal(game.laserBeams[i].ownerId, guests[i].id);
}
assert.equal(hits.length, 6);
for (let i = 0; i < 3; i++) {
  assert.equal(hits[i * 2].attacker, guests[i]);
  assert.equal(hits[i * 2 + 1].attacker, guests[i]);
}
assert.equal(engine.update(game, { id: 'fallen', hp: 0, weapons: { blaster: 1 } }, 1), 0);
assert.equal(engine.update(game, { id: 'downed', hp: 80, downed: true, weapons: { blaster: 1 } }, 1), 0);
assert.equal(game.player.timers.blaster, undefined, 'Guest ticks cannot use the host timer state');
assert.equal(engine.update(game, game.player, .5), 1, 'Host uses the same API');
assert.equal(game.bullets[3].ownerId, 'host');
assert.equal(game.bullets[3].owner, 'host');
console.log('Per-pilot weapons passed: seven exact cooldown curves, four independent shooters, damage ownership and paused/downed guards.');
