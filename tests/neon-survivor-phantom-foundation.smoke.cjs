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
assert.equal(p.catalog.find(c => c.id === 'charge_overflow').name, '潜行超蓄');
assert.equal(p.catalog.find(c => c.id === 'spiritual_flow').name, '虚空脉动');
assert.ok(p.catalog.every(c => c.shipId === 'phantom' &&
  ['common', 'rare', 'legendary'].includes(c.rarity)));

// 2. State & Stealth Charges (No Ectoplasm requirement)
const ghost = {
  shipId: 'phantom', id: 'p-ghost', x: 0, y: 0, hp: 92,
  dmgMultiplier: 1, level: 1
};
let s = p.state(ghost);
assert.equal(s.dashCharges, 2);
assert.equal(p.critBonus(ghost, 0), 0);

s.passiveUpgrades.phantom_core = 3;
assert.ok(Math.abs(p.critBonus(ghost, 0) - 0.27) < 0.001, 'Phantom core +9% crit per level');

s.passiveUpgrades.dual_mind = 2;
s.shiftActive = true;
assert.ok(Math.abs(p.critBonus(ghost, 0) - 0.37) < 0.001, 'Dual mind +5% crit per level during stealth/sprint');
s.shiftActive = false;

// 3. Spectral Shift, Follow-vortex & Soul Marks
const hits = [];
const game = {
  state: 'playing', survivalTime: 5, enemies: [], shockwaves: [],
  dealDamage(enemy, damage, source, crit, owner) {
    hits.push({ enemy, damage, source, owner });
    enemy.hp -= damage;
    if (enemy.hp <= 0) enemy.dead = true;
  }
};

// [J] Sprint
assert.equal(p.sprint(ghost, game), true);
assert.equal(s.sprintTimer, 3.0);
assert.ok(s.sprintCooldown > 0);
assert.equal(p.sprint(ghost, game), false, 'Sprint on cooldown');
s.sprintCooldown = 0;

// [K] Player-following Void Field (Non-stealth = Repel / Push outward)
const enemyV1 = { x: 50, y: 0, hp: 1000, dead: false };
game.enemies = [enemyV1];
assert.equal(p.vortexPull(ghost, game), true);
assert.ok(enemyV1.x > 50, 'Non-stealth pushes enemy away');
assert.ok(s.vortexTimer >= 2.6);
assert.ok(s.vortexCooldown >= 5.0);
assert.ok(hits.some(h => h.source === 'phantom_vortex'));
s.vortexCooldown = 0;

// [Space] Shift
assert.equal(p.enterShift(ghost, game), true);
assert.equal(s.shiftActive, true);
assert.ok(s.stealthEnergy > 0, 'Stealth energy available');
assert.ok(s.shiftRemaining >= 2.0);

// [K] while shifted = Pull inward
const enemyPull = { x: 180, y: 0, hp: 1000, dead: false };
game.enemies = [enemyPull];
assert.equal(p.vortexPull(ghost, game), true);
assert.ok(enemyPull.x < 180, 'Stealth pulls enemy inward');
s.vortexCooldown = 0;

const enemyA = { x: 50, y: 0, hp: 1000, dead: false };
const enemyB = { x: 120, y: 0, hp: 50, dead: false };
game.enemies = [enemyA, enemyB];

assert.equal(p.markEnemy(ghost, enemyA, 5.0), true);
assert.equal(p.markEnemy(ghost, enemyB, 5.0), true);
assert.equal(s.marks.size, 2);

// Reap marks on exit
assert.equal(p.finishShift(ghost, game, true), true);
assert.equal(hits.some(h => h.source === 'phantom_reap'), true);
assert.equal(enemyB.dead, true);
assert.ok(s.stealthEnergy > 0, 'Killing marked target refunds stealth energy');

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

// Slingshot upgrade on eject
s.warpUpgrades.symbiote_slingshot = 1;
assert.equal(p.undock(ghost, game, true), true);
assert.equal(s.docked, false);
assert.equal(carrier.hasDockedGunner, false);
assert.ok(p.critBonus(ghost, 5.5) >= 1.0, 'Slingshot grants 100% crit bonus');
assert.equal(p.canDock(ghost, carrier), false, 'Dock cooldown active after undocking');

// 5. Finishing shift grants 0.35s invulnerability
s.stealthEnergy = 3.0;
assert.equal(p.enterShift(ghost, game), true);
assert.equal(p.finishShift(ghost, game, true), true);
assert.ok(ghost.invulnTimer >= 0.35, '0.35s un-targetable window on exiting shift');

console.log('Phantom foundation passed: 24-card catalog, continuous stealth, sprint/vortex & co-op docking.');
