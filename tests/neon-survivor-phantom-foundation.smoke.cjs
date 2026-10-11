/* Run: node tests/neon-survivor-phantom-foundation.smoke.cjs */
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
const p = ctx.window.NeonPhantom;

// 1. Catalog integrity
const count = type => p.catalog.filter(card => card.type === type);
assert.equal(count('weapon').length, 9);
assert.equal(count('passive').length, 8);
assert.equal(count('dash').length, 7);
assert.equal(p.catalog.length, 24);
assert.equal(new Set(p.catalog.map(c => c.id)).size, 24);
assert.equal(p.catalog.find(c => c.id === 'phantom_scythe').maxLvl, 5);
assert.equal(p.catalog.find(c => c.id === 'spectral_extend').maxLvl, 2);
assert.ok(p.catalog.every(c => c.shipId === 'phantom' &&
  ['common', 'rare', 'legendary'].includes(c.rarity)));

// 2. State & Ectoplasm Resource
const ghost = {
  shipId: 'phantom', id: 'p-ghost', x: 0, y: 0, hp: 85,
  dmgMultiplier: 1
};
let s = p.state(ghost);
assert.equal(s.ectoplasm, 0);
assert.equal(s.dashCharges, 2);
assert.equal(p.addEctoplasm(ghost, 20), 20);
assert.equal(s.ectoplasm, 20);
assert.equal(p.critBonus(ghost, 0), 0.05); // 20 ectoplasm -> 5% crit

s.passiveUpgrades.phantom_core = 3;
assert.ok(Math.abs(p.critBonus(ghost, 0) - 0.31) < 0.001); // 0.05 + 0.26

// 3. Spectral Shift & Soul Marks
const hits = [];
const game = {
  state: 'playing', survivalTime: 5, enemies: [], shockwaves: [],
  dealDamage(enemy, damage, source, crit, owner) {
    hits.push({ enemy, damage, source, owner });
    enemy.hp -= damage;
    if (enemy.hp <= 0) enemy.dead = true;
  }
};

assert.equal(p.enterShift(ghost, game), true);
assert.equal(s.dashCharges, 1);
assert.equal(s.shiftActive, true);
assert.ok(s.shiftRemaining >= 1.6);

const enemyA = { x: 50, y: 0, hp: 1000, dead: false };
const enemyB = { x: 120, y: 0, hp: 50, dead: false };
game.enemies = [enemyA, enemyB];

assert.equal(p.markEnemy(ghost, enemyA, 5.0), true);
assert.equal(p.markEnemy(ghost, enemyB, 5.0), true);
assert.equal(s.marks.size, 2);
assert.equal(s.ectoplasm, 28); // 20 + 2 * 4

// Reap marks
const countReaped = p.reap(ghost, game);
assert.equal(countReaped, 2);
assert.equal(hits.length, 2);
assert.equal(hits[0].source, 'phantom_reap');
assert.equal(enemyB.dead, true);
assert.ok(s.dashRecharge > 0, 'Killing marked target refunds dash recharge');

// 4. Tactical Docking & Eject
const carrier = {
  shipId: 'riftblade', id: 'p-carrier', x: 200, y: 0, hp: 100, maxHp: 100
};
assert.equal(p.canDock(ghost, carrier), false, 'Too far (200 > 150)');
carrier.x = 80;
assert.equal(p.canDock(ghost, carrier), true);
assert.equal(p.dock(ghost, carrier), true);
assert.equal(s.docked, true);
assert.equal(carrier.hasDockedGunner, true);
assert.equal(ghost.x, 80);

// Carrier rear damage reduction
assert.equal(p.carrierDamageReduction(carrier, Math.PI), 0.40);
assert.equal(p.carrierDamageReduction(carrier, 0), 0); // Frontal hits not reduced

// Natural ectoplasm gain during dock tick
const prevEcto = s.ectoplasm;
p.tick(ghost, game, 1.0);
assert.ok(s.ectoplasm > prevEcto);

// Slingshot upgrade on eject
s.warpUpgrades.symbiote_slingshot = 1;
assert.equal(p.undock(ghost, game, true), true);
assert.equal(s.docked, false);
assert.equal(carrier.hasDockedGunner, false);
assert.ok(p.critBonus(ghost, 5.5) >= 1.0, 'Slingshot grants 100% crit bonus');
assert.equal(p.canDock(ghost, carrier), false, 'Dock cooldown active after undocking');

console.log('Phantom foundation passed: 24-card catalog, ectoplasm curve, spectral marks & co-op docking.');
