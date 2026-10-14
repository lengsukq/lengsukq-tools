/* Run: node tests/neon-survivor-arsenal.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.match(html, /js\/arsenal\.js/);
assert.ok(html.indexOf('js/arsenal.js') < html.indexOf(neonCore.coreScriptPaths()[0]),
  'Fire-control module must load before the game engine');

const sandbox = {
  window: { addEventListener() {} },
  document: { getElementById() { return null; } },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  console, performance: { now: () => 0 }, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + 'js/arsenal.js', 'utf8'), sandbox);
neonCore.runCore(sandbox);

const arsenal = sandbox.window.NeonLegendaryArsenal;
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const definitions = vm.runInContext('UPGRADES_DB', sandbox);
const def = Array.from(definitions).find(d => d.id === 'multishot');
assert.equal(def.name, '星穹火控矩阵');
assert.equal(def.rarity, 'legendary');
assert.equal(def.maxLvl, 5);
assert.equal(def.statText.length, 5);

const game = Object.create(proto);
game.state = 'playing';
game.player = {
  level: 20, hp: 100, maxHp: 100, dmgMultiplier: 1.2,
  passives: {}, weapons: { blaster: 1, orbit: 5 },
  dashUpgrades: {}, limitBreaks: {}, dashCharges: 3, areaMultiplier: 1,
  x: 0, y: 0
};
game.enemies = Array.from({ length: 6 }, (_, i) => ({
  x: 80 + i * 60, y: 0, hp: 1000, radius: 12, color: '#fff'
}));
game.particles = [];
game.shockwaves = [];
game.orbiters = [];
game.weaponsBar = { innerHTML: '', appendChild() {} };
let damageCalls = [];
game.dealDamage = (enemy, damage, source) => {
  damageCalls.push({ enemy, damage, source });
  enemy.hp -= damage;
};
for (let level = 1; level <= 5; level++) {
  game.player.passives.multishot = level;
  game.player.arsenalEchoTimer = 0;
  game.recalculatePassives();
  const cfg = arsenal.config(level);
  assert.equal(game.player.extraProjectiles, cfg.projectiles);
  game.syncOrbiters();
  assert.equal(game.orbiters.length, 5 + Math.min(2, cfg.projectiles));

  damageCalls = [];
  arsenal.update(game, cfg.cooldown - 0.01);
  assert.equal(damageCalls.length, 0, 'No premature echo at level ' + level);
  arsenal.update(game, 0.02);
  assert.equal(damageCalls.length, cfg.targets, 'Target count mismatch at level ' + level);
  assert.ok(damageCalls.every(call => call.source === 'arsenal_echo'));
  assert.equal(damageCalls[0].damage, cfg.damage * game.player.dmgMultiplier);
  arsenal.update(game, 0.1);
  assert.equal(damageCalls.length, cfg.targets, 'Only one salvo per cooldown');
}

// The LV5 attack is independent of physical bullet count and respects a strict cap.
assert.equal(arsenal.config(5).targets, 5);
assert.equal(arsenal.config(5).projectiles, 3);
game.player.passives.multishot = 5;
game.recalculatePassives();
game.bullets = [];
game.sound = { playLaser() {} };
game.player.aimAngle = 0;
game.player.weapons.missiles = 5;
game.fireMissiles(5);
assert.ok(game.bullets.length <= 16, 'Legendary upgrade must not create unbounded missile storms');

game.state = 'paused';
damageCalls = [];
arsenal.update(game, 100);
assert.equal(damageCalls.length, 0, 'No free attacks while paused or in choice screens');

console.log('Neon Survivor legendary arsenal passed: correct 5 levels, bounded projectiles, auto-salvos and pause isolation.');
