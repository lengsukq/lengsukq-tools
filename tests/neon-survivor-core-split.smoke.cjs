/* Run: node tests/neon-survivor-core-split.smoke.cjs
 *
 * The core game is split across js/core/*.js loaded by index.html. Classic
 * scripts have no module resolver, so the two failure modes that no gameplay
 * test can catch are:
 *   1. a core file on disk that index.html never loads (dead code, silent bug)
 *   2. a <script> tag pointing at a file that does not exist (broken page)
 * This test closes both, pins the load order, and pins the public method
 * surface that other modules call through NeonSurvivorGame.prototype.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const html = neonCore.html();
const tags = neonCore.scriptTags();
const corePaths = neonCore.coreScriptPaths();
const split = corePaths.length > 1;

// --- every core file on disk is loaded by index.html ---
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}
const coreDir = path.join(neonCore.ROOT, 'js/core');
const onDisk = walk(coreDir)
  .map(full => 'js/core/' + path.relative(coreDir, full).split(path.sep).join('/'))
  .sort();
const loaded = corePaths.filter(p => p !== 'js/core.js').sort();

if (split) {
  assert.deepEqual(loaded, onDisk,
    'index.html and js/core/ disagree: every core file must be loaded exactly once');
  assert.ok(!fs.existsSync(path.join(neonCore.ROOT, 'js/core.js')),
    'the legacy single-file js/core.js must be removed once the split is in place');
} else {
  assert.deepEqual(corePaths, ['js/core.js'], 'pre-split: the single core file is the only core script');
}

// --- every core <script> tag resolves to a real file ---
for (const tag of tags) {
  if (tag.path !== 'js/core.js' && !tag.path.startsWith('js/core/')) continue;
  assert.ok(fs.existsSync(path.join(neonCore.ROOT, tag.path)),
    `index.html loads a missing core file: ${tag.path}`);
}

// --- load order: helper, then class, then subsystem mixins, then boot ---
if (split) {
  const at = name => corePaths.indexOf('js/core/' + name);
  assert.equal(at('define.js'), 0, 'NeonCore.define must be the first core script');
  assert.ok(at('game.js') > at('define.js'), 'the class must load after the define helper');
  assert.equal(at('boot.js'), corePaths.length - 1, 'boot.js must be the last core script');
  // A file that augments the prototype must load after the class it augments.
  // Dependencies (constants, data, audio) legitimately load earlier.
  const mixins = corePaths.filter(part => part !== 'js/core/define.js' &&
    fs.readFileSync(path.join(neonCore.ROOT, part), 'utf8').includes('NeonCore.define('));
  assert.ok(mixins.length > 15, `expected many mixin files, found ${mixins.length}`);
  for (const part of mixins) {
    assert.ok(at(part.slice('js/core/'.length)) > at('game.js'),
      `${part} augments NeonSurvivorGame.prototype and must load after game.js`);
  }
  // Guard against the files silently growing back into a monolith.
  for (const part of corePaths) {
    const lines = fs.readFileSync(path.join(neonCore.ROOT, part), 'utf8').split('\n').length;
    assert.ok(lines <= 500, `${part} has ${lines} lines; keep core modules under 500`);
  }
}

// --- the four globals the rest of the test suite reads must survive ---
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
for (const name of ['NeonSurvivorGame', 'NEON_DIFFICULTIES', 'UPGRADES_DB', 'SoundEngine']) {
  assert.equal(typeof vm.runInContext(`typeof ${name}`, sandbox), 'string',
    `${name} must remain a top-level binding`);
  assert.notEqual(vm.runInContext(`typeof ${name}`, sandbox), 'undefined',
    `${name} must remain a top-level binding`);
}
assert.equal(vm.runInContext('NEON_DIFFICULTIES.length', sandbox), 7);
assert.ok(vm.runInContext('UPGRADES_DB.length', sandbox) > 10);

// --- methods other modules call through the prototype must stay there ---
// Sources: combat/weapons.js dynamic dispatch, network/coop.js and
// network/world-view.js `Object.create(game)` receivers, and ship modules.
const externalSurface = [
  'dealDamage', 'hitPlayer', 'onEnemyKilled', 'rollNormalDrop', 'playCombatSound',
  'updateHUD', 'renderWeaponsHUD', 'renderUpgradeChoices', 'renderFighter', 'render',
  'update', 'loop', 'gainXP', 'triggerLevelUp', 'applyUpgrade', 'applyLimitBreak',
  'recalculateMoveSpeed', 'recalculatePassives', 'recalculateDashStats',
  'syncOrbiters', 'syncDrones', 'triggerDash', 'spawnEnemyWave', 'spawnBoss',
  'spawnEliteIncursion', 'updateSpawning', 'getAdaptiveScaling', 'getLevelDmgMult',
  'findNearestEnemy', 'cleanAndCompactGems', 'notifySkillFeedback',
  'gameOver', 'victory', 'pauseGame', 'resumeGame', 'showStartMenu', 'hideAllModals',
  'startNewGame', 'releaseJoystickTouch', 'isUpgradeAvailableFor',
  'getCoopUpgradeDefinition', 'getCoopUpgradeChoices', 'getUpgradeCatalog',
  'getUpgradeChoiceCount', 'getDifficultyRules', 'getPassiveSlotLimit',
  'getUpgradeSlotLimits', 'getEffectiveDashRecharge', 'selectDifficulty',
  'saveRunResults', 'renderDifficultySelector', 'openHelpModal', 'closeHelpModal',
  'toggleFullscreen', 'updateFullscreenButton', 'setupGamepad', 'pollGamepad',
  'toggleGamepadVibration', 'testGamepadVibration', 'vibrateGamepad',
  'finishGamepadMenuFrame', 'rememberGamepadButtons', 'showGamepadFeedback',
  'setupEvents', 'setupTouchControls', 'resize', 'initDOM',
  'castAstraWard', 'castAstraMeteor', 'triggerPhantomSprint', 'triggerPhantomVortex',
  'togglePhantomDock', 'getWarpDirection', 'updateCombatSkillsDock',
  'fireBlaster', 'fireTesla', 'fireMissiles', 'fireNova', 'fireLaser',
  'fireBlackHole', 'fireCryoMine', 'nextEndlessUpgradeChoices', 'rerollEndlessUpgrade',
  'banishEndlessUpgrade', 'skipEndlessUpgrade', 'finishUpgradeSelection',
  'confirmUpgradePreview', 'cancelUpgradePreview', 'refreshUpgradeControls',
  'selectUpgradePreview', 'isDuplicateCombatSkillClick', 'renderStatsTable',
  'saveEndlessResults', 'renderCyberGrid'
];
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const missing = externalSurface.filter(name => typeof proto[name] !== 'function');
assert.deepEqual(missing, [], 'these prototype methods are called from other modules');

// Class methods are non-enumerable; the split must not change that, because
// network/world-view.js builds guest views with Object.create(game).
const enumerable = Object.keys(proto);
assert.deepEqual(enumerable, [], 'prototype methods must stay non-enumerable');

// The split must not leak extra globals beyond the tested contract. The four
// tested names live in the shared global *lexical* scope (classic-script const),
// so they are deliberately absent from globalThis; anything that does show up
// here is an accidental `window.X =` or `var` leak.
const leaked = [...vm.runInContext(
  'Object.getOwnPropertyNames(globalThis).filter(n => /^Neon(Core)?[A-Z]/.test(n))', sandbox)];
assert.deepEqual(leaked, [], 'the split must not add Neon* globals to globalThis');

console.log(split
  ? `Core split passed: ${corePaths.length} ordered modules, no orphan files, ${externalSurface.length} prototype methods intact.`
  : 'Core split passed: pre-split single file, prototype surface and globals intact.');
