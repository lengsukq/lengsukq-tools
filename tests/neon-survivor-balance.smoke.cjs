/* Run: node tests/neon-survivor-balance.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/Game/neon-survivor/index.html', 'utf8');
const source = fs.readFileSync('public/Game/neon-survivor/js/core.js', 'utf8');
const storage = new Map();
const sandbox = {
  window: { addEventListener() {} },
  document: { getElementById() { return null; } },
  navigator: { getGamepads() { return []; } },
  localStorage: {
    getItem(k) { return storage.get(k) ?? null; },
    setItem(k, v) { storage.set(k, String(v)); },
  },
  console, performance: { now: () => 1000 },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const tiers = vm.runInContext('NEON_DIFFICULTIES', sandbox);
assert.equal(tiers.length, 7, 'Standard plus six ascensions');
assert.equal(tiers[6].nukeDrops, 0.1);
assert.equal(tiers[6].normalDrops, 0.6);

const game = Object.create(proto);
game.difficulty = 0;
assert.equal(game.getPassiveSlotLimit(), 4);
assert.equal(game.rollNormalDrop(0.034), 'nuke');
game.difficulty = 6;
assert.equal(game.getPassiveSlotLimit(), 3);
assert.equal(game.rollNormalDrop(0.034), 'gem', 'A former standard nuke roll is not a nuke in VI');
assert.equal(game.rollNormalDrop(0.016), 'nuke', 'Nukes remain rare but possible');
assert.equal(game.rollNormalDrop(0.016, 'nuke'), 'gem', 'Nuke kills cannot cascade into nukes');

// Reproducible drop-rate simulation, independent of real-time gameplay.
function sampleDrops(tier, samples = 200000) {
  game.difficulty = tier;
  let seed = 927431, nuke = 0, heal = 0, magnet = 0;
  for (let i = 0; i < samples; i++) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const item = game.rollNormalDrop(seed / 4294967296);
    if (item === 'nuke') nuke++;
    if (item === 'heal') heal++;
    if (item === 'magnet') magnet++;
  }
  return { nuke, heal, magnet };
}
const baseline = sampleDrops(0);
const nightmare = sampleDrops(6);
assert.ok(baseline.nuke > nightmare.nuke * 7, 'VI should greatly suppress nuke drops');
assert.ok(baseline.heal > nightmare.heal * 1.4, 'VI should reduce recovery drops');
assert.ok(baseline.magnet > nightmare.magnet * 1.4, 'VI should reduce magnet drops');

game.player = {
  level: 20, dmgMultiplier: 1, areaMultiplier: 1, cdrMultiplier: 0.1,
  dashUpgrades: { dash_charge: 6, dash_aegis: 6, dash_area: 4 },
  limitBreaks: { dash_aegis: 100 }, dashCharges: 3,
  radius: 16, x: 0, y: 0, invulnTimer: 0, dashDuration: 0.18, aimAngle: 0
};
game.recalculateDashStats();
assert.equal(game.player.maxDashCharges, 9);
assert.equal(game.player.aegisDuration, 0.40, 'Limit breaks must not increase aura duration');
assert.equal(game.player.hasAegisBurst, true);
assert.equal(game.getEffectiveDashRecharge(), 0.70, 'Haste cannot bypass recharge floor');

// Level progression is applied in dealDamage once, including for dash slashes.
game.endlessMode = false;
game.player.dashUpgrades = { dash_dmg: 0 };
game.player.limitBreaks = {};
game.player.critRate = 0;
game.player.critDmg = 2;
game.player.cdrMultiplier = 1;
game.texts = [];
game.particles = [];
game.totalDamageDealt = 0;
for (const level of [1, 10, 20, 30]) {
  game.player.level = level;
  game.recalculateDashStats();
  assert.equal(game.player.dashSlashDmg, 95,
    'Dash base damage must not contain a second character-level multiplier');
  const target = { x: 0, y: 0, hp: 100000, color: '#fff' };
  game.dealDamage(target, game.player.dashSlashDmg, 'dash');
  const expected = 95 * (1 + (level - 1) * 0.03);
  assert.ok(Math.abs(100000 - target.hp - expected) < 0.0001,
    'Character-level damage is applied once at level ' + level);
}
game.player.level = 20;
game.player.critRate = 1; // Previously a forced dash crit could also randomly crit again.
game.recalculateDashStats();
const forcedTarget = { x: 0, y: 0, hp: 100000, color: '#fff' };
game.dealDamage(forcedTarget, game.player.dashSlashDmg, 'dash', true);
assert.ok(Math.abs(100000 - forcedTarget.hp - (95 * 1.57 * 2)) < 0.0001,
  'A guaranteed dash critical hit applies its critical multiplier exactly once');

game.player.dashUpgrades = { dash_charge: 6, dash_aegis: 6, dash_area: 4 };
game.player.limitBreaks = { dash_aegis: 100 };
game.player.cdrMultiplier = 0.1;
game.recalculateDashStats();
assert.equal(game.player.maxDashCharges, 9);
assert.equal(game.player.aegisDuration, 0.40);
assert.equal(game.getEffectiveDashRecharge(), 0.70);
game.player.dashCharges = 9;
game.state = 'playing';
game.survivalTime = 30;
game.keys = {};
game.touch = { active: false };
game.shockwaves = [];
game.sound = { playDash() {} };
game.gamepadVibrationEnabled = false;
game.gamepadIndex = -1;
game.triggerDash();
assert.equal(game.player.dashCharges, 8);
assert.ok(game.player.invulnTimer <= 0.400001, 'Dash and aura protection must overlap');
assert.ok(Number.isFinite(game.player.aegisRadius) && game.player.aegisRadius < 1000,
  'Repeated aura limit breaks must not create infinite-range passive damage');

// Exercise the actual start-screen selector; a locked tier must stay inaccessible.
const ui = { choices: [], textContent: '' };
const selector = {
  innerHTML: '',
  querySelector(query) {
    return query === '#neon-difficulty-buttons'
      ? { appendChild(button) { ui.choices.push(button); } } : ui;
  }
};
sandbox.document.getElementById = id => id === 'neon-difficulty-selector' ? selector : null;
sandbox.document.createElement = () => ({ style: {}, disabled: false });
const chooser = Object.create(proto);
chooser.state = 'start';
chooser.difficulty = 0;
chooser.selectedDifficulty = 0;
chooser.unlockedDifficulty = 2;
chooser.renderDifficultySelector();
assert.equal(ui.choices.length, 7);
assert.equal(ui.choices[2].disabled, false);
assert.equal(ui.choices[3].disabled, true);
chooser.selectDifficulty(3);
assert.equal(chooser.selectedDifficulty, 0);
chooser.selectDifficulty(2);
assert.equal(chooser.selectedDifficulty, 2);
assert.equal(storage.get('neon_difficulty_selected'), '2');

const recorder = Object.create(proto);
recorder.difficulty = 0;
recorder.unlockedDifficulty = 0;
recorder.kills = 20;
recorder.survivalTime = 180;
recorder.renderDifficultySelector = () => {};
recorder.saveRunResults(true);
assert.equal(recorder.unlockedDifficulty, 1);
assert.equal(storage.get('neon_ascension_unlocked'), '1');
assert.equal(JSON.parse(storage.get('neon_ascension_records_v2'))['0'].wins, 1);
assert.equal(recorder.getDifficultyRules().name, '标准');

assert.match(html, /id="help-ascension"/);
assert.match(html, /id="neon-difficulty-selector"/);
assert.match(source, /this\.dealDamage\(en, 9999, 'nuke'\)/);
console.log('Neon Survivor balance smoke test passed: six tiers, drops, 9 dashes, single level/crit multipliers, aegis, records and manual.');
