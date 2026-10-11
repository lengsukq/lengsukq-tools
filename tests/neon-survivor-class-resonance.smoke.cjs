/* Run: node tests/neon-survivor-class-resonance.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(root + 'network/resonance.js', 'utf8'), context);
const r = context.window.NeonLanResonance;
const approx = (actual, expected, tolerance = .11) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} ~= ${expected}`);
};
const host = { shipId: 'riftblade', x: 0, y: 0, hp: 100, maxHp: 100, level: 1 };
const guest = { shipId: 'astra', x: 180, y: 0, hp: 95, maxHp: 95, level: 1 };
const game = { player: host, state: 'playing', enemies: [],
  survivalTime: 0, difficulty: 0, shockwaves: [], texts: [], dealDamage() {} };
const state = { pulseCooldown: 0, lastDash: {} };
assert.equal(r.link(host, guest).tier, 2);
assert.equal(r.link(host, guest).damageBonus, .08);
assert.equal(r.link(host, guest).shieldSource, true);
guest.x = 340;
assert.equal(r.link(host, guest).tier, 1);
assert.equal(r.link(host, guest).damageBonus, .05);
guest.x = 341;
assert.equal(r.link(host, guest).active, false);
guest.x = 180;

game.survivalTime = 1;
r.update(game, guest, state, 1);
assert.equal(host.coopShield, undefined, 'No shields at the beginning of the link');
assert.equal(state.linkStable, 1);
game.survivalTime = 12;
r.update(game, guest, state, 11);
approx(host.coopShield.value, 14.5);
approx(guest.coopShield.value, 14.5);
assert.equal(host.coopShield.expiresAt, 18);
assert.equal(r.remainingShield(host, 12), 14.5);
assert.equal(r.absorb(host, 10, 13), 0);
approx(r.remainingShield(host, 13), 4.5);
approx(r.absorb(host, 10, 14), 5.5);
assert.equal(r.remainingShield(host, 14), 0);
assert.equal(r.absorb(guest, 200, 19), 200, 'Expired shield never absorbs damage');
assert.equal(guest.coopShield, null);

host.level = guest.level = 10;
game.survivalTime = 24;
game.enemies = [{ damage: 20 }, { damage: 22 }, { damage: 18 }];
r.update(game, guest, state, 12);
approx(host.coopShield.value, 27.6);
assert.ok(host.coopShield.value <= host.maxHp * .3);
approx(r.link(host, guest).damageBonus, .1232, .001);
host.level = guest.level = 80;
game.survivalTime = 36;
game.enemies = Array.from({ length: 35 }, () => ({ damage: 100 }));
r.update(game, guest, state, 12);
assert.equal(host.coopShield.value, 30, 'Shield cannot exceed 30% recipient HP');
assert.ok(guest.coopShield.value <= guest.maxHp * .3);
assert.ok(state.link.damageBonus <= .18);
guest.x = 345;
game.survivalTime = 37;
r.update(game, guest, state, 1);
assert.equal(state.link.damageBonus, 0);
assert.equal(state.shieldTimer, 0);
assert.ok(r.remainingShield(host, 37) > 0, 'Previously granted shields expire naturally');
game.survivalTime = 43;
assert.equal(r.remainingShield(host, 43), 0);
guest.x = 150;
guest.downed = true;
assert.equal(r.link(host, guest).active, false, 'Downed ships cannot link');
guest.downed = false;

// Neither class aura may stack with another source of the same class.
host.shipId = 'astra';
assert.equal(r.link(host, guest).damageBonus, 0, 'Two mages do not invent an attack bonus');
assert.equal(r.link(host, guest).shieldSource, true);
guest.shipId = 'riftblade';
host.shipId = 'riftblade';
assert.equal(r.link(host, guest).shieldSource, false, 'Two attackers do not generate mage shields');
assert.ok(r.link(host, guest).damageBonus <= .18);
host.shipId = 'astra';
guest.shipId = 'astra';
assert.equal(r.shieldAmount(host, 90, 40, true), 30);
const largeShip = { hp: 250, maxHp: 250 };
assert.equal(r.shieldAmount(largeShip, 90, 40, true), 45);

// Phantom brings crit aura and docking resonance
host.shipId = 'phantom';
guest.shipId = 'riftblade';
guest.x = 100;
const phantomLink = r.link(host, guest);
assert.equal(phantomLink.critSource, true);
assert.equal(phantomLink.critBonus, 0.12);
assert.equal(phantomLink.docked, false);

host.hasDockedGunner = true;
const dockedLink = r.link(host, guest);
assert.equal(dockedLink.docked, true);
assert.ok(dockedLink.damageBonus >= 0.20);
host.hasDockedGunner = false;

// Boss HP/damage is ignored in threat scoring; even ordinary waves cannot
// change the factor by more than 10% or cause an instant one-frame spike.
const scary = { enemies: [{ isBoss: true, damage: 999999 },
  ...Array.from({ length: 35 }, () => ({ damage: 999 }))], difficulty: 6 };
const t = r.threat(scary, 1, .016);
assert.ok(t < 1.002);
assert.ok(r.threat(scary, 1, 30) <= 1.1);
assert.ok(r.threat({ enemies: [], difficulty: 0 }, 1, 30) >= .9);
console.log('Class resonance passed: attack scaling, mage shields, threat smoothing, class range and expiration.');
