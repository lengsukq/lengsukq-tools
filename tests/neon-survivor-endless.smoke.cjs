/* Run: node tests/neon-survivor-endless.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const legacy = fs.readFileSync('public/Game/neon_survivor.html', 'utf8');
assert.match(legacy, /neon-survivor\/index\.html/);
for (const file of ['relics', 'fusions', 'events', 'endless', 'ui', 'core']) {
  assert.ok(html.includes('/Game/neon-survivor/js/' + file + '.js'), 'Missing module ' + file);
}
assert.match(html, /game\.css/);
assert.ok(html.indexOf('id="help-endless"') > html.indexOf('id="modal-help"'),
  'Endless help must be inside the help modal, not the combat HUD');

const scheduled = [];
let currentChoice;
const bossTitle = { textContent: '首领' };
const stored = new Map();
const sandbox = {
  window: { addEventListener() {}, NeonRogueUI: {
    open(game, title, options, onPick) {
      currentChoice = { game, title, options, onPick };
      game.state = 'endless-choice';
      return true;
    },
    update() {}
  } },
  document: { getElementById: id => id === 'boss-name' ? bossTitle : null },
  localStorage: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value))
  },
  navigator: { getGamepads: () => [] }, performance: { now: () => 500 },
  console, setTimeout(callback) { scheduled.push(callback); return scheduled.length; }, clearTimeout,
  setInterval, clearInterval
};
vm.createContext(sandbox);
for (const name of ['relics', 'fusions', 'events', 'endless', 'core']) {
  vm.runInContext(fs.readFileSync(root + 'js/' + name + '.js', 'utf8'), sandbox);
}
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const { NeonRogueRelics: relics, NeonRogueFusions: fusions,
  NeonRogueEndless: endless, NeonRogueEvents: events } = sandbox.window;
assert.ok(relics.definitions.length >= 12);
assert.ok(fusions.recipes.length >= 5);
assert.ok(events.definitions.length >= 6);
assert.equal(endless.routes.length, 3);
assert.ok(endless.affixes.length >= 5);
const weighted = [
  { id: 'common', rarity: 'common' }, { id: 'rare', rarity: 'rare' },
  { id: 'legendary', rarity: 'legendary' }
];
assert.equal(endless.pickUpgrades(weighted, 2, () => 0)[0].id, 'common');
assert.equal(endless.pickUpgrades(weighted, 2, () => 0.999)[0].id, 'legendary');

const game = Object.create(proto);
Object.assign(game, {
  state: 'victory', endlessMode: false, difficulty: 0, bossCycle: 1,
  survivalTime: 180, width: 900, height: 600, kills: 120,
  player: {
    x: 0, y: 0, hp: 100, maxHp: 100, crystals: 0, dmgMultiplier: 1,
    weapons: { blaster: 5, tesla: 3, laser: 3 },
    passives: {}, dashUpgrades: { dash_charge: 3 }
  },
  texts: [], shockwaves: [], enemies: [], enemyBullets: [],
  sound: { playExplosion() {}, playDash() {} }
});
endless.reset(game);
assert.equal(game.endlessState.relics.length, 0);
endless.start(game);
assert.equal(game.endlessMode, true);
assert.equal(game.state, 'endless-choice');
assert.equal(currentChoice.options.length, 3);
assert.ok(currentChoice.options.some(c => c.kind === 'relic'));
const firstReward = currentChoice.options.find(c => c.kind === 'relic');
game.state = 'playing';
currentChoice.onPick(firstReward);
assert.ok(game.endlessState.relics.includes(firstReward.id));
assert.match(currentChoice.title, /战区/);
game.state = 'playing';
currentChoice.onPick(endless.routes[0]);
assert.equal(game.endlessState.routeId, 'hunt');
assert.equal(endless.getEnemyHpMultiplier(game), 1.15);
assert.equal(endless.getEliteMultiplier(game), 1.3);
assert.equal(game.endlessState.nextEventAt, 245);

assert.ok(fusions.available(game).some(r => r.id === 'storm_lance'));
assert.equal(fusions.acquire(game, 'storm_lance'), true);
assert.equal(fusions.acquire(game, 'storm_lance'), false);
assert.ok(fusions.modifyDamage(game, {}, 100, 'laser') > 100);
assert.equal(fusions.modifyDamage(game, {}, 100, 'nuke'), 100);
assert.equal(relics.acquire(game, 'boss_hunter'), true);
assert.ok(relics.modifyDamage(game, { isBoss: true }, 100, 'combat') > 100);
assert.equal(relics.acquire(game, 'boss_hunter'), false);

const glassGame = Object.create(proto);
glassGame.endlessMode = true;
glassGame.endlessState = { relics: ['glass_reactor'], fusions: [] };
glassGame.player = { level: 10, hp: 150, maxHp: 170,
  passives: { armor: 2 }, weapons: { blaster: 1 }, dashUpgrades: {},
  dashCharges: 3, limitBreaks: {}, dmgMultiplier: 1 };
glassGame.recalculatePassives();
assert.equal(glassGame.player.maxHp, 128, 'Glass reactor penalty must survive passive recalculation');
assert.equal(glassGame.player.hp, 128);

// Reroll and banish modify the current card pool but not equipped abilities.
game.state = 'levelup';
game.endlessUpgradeRerolls = 1;
game.endlessUpgradeBanishes = 1;
game.banishedUpgrades = new Set();
game.levelupEligible = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id, rarity: 'common' }));
game.currentUpgradeChoices = game.levelupEligible.slice(0, 3);
game.renderUpgradeChoices = function(cards) { this.currentUpgradeChoices = cards; };
assert.equal(game.rerollEndlessUpgrade(), true);
assert.equal(game.endlessUpgradeRerolls, 0);
assert.equal(game.rerollEndlessUpgrade(), false);
const banishId = game.currentUpgradeChoices[0].id;
assert.equal(game.banishEndlessUpgrade(banishId), true);
assert.equal(game.banishedUpgrades.has(banishId), true);
assert.ok(game.currentUpgradeChoices.every(card => card.id !== banishId));
assert.equal(game.banishEndlessUpgrade('another'), false);
game.state = 'playing';

const event = events.begin(game, () => 0);
assert.equal(event.id, 'hunt');
const crystalsBeforeEvent = game.player.crystals;
for (let i = 0; i < 35; i++) events.onKill(game, { isBoss: false, isElite: false });
events.update(game, 0.016);
assert.equal(game.endlessState.eventsWon, 1);
assert.equal(game.endlessState.event, null);
assert.equal(game.player.crystals, crystalsBeforeEvent + 25);
const noDash = game.endlessState.event = { id: 'no_dash', remaining: 25, progress: 0, failed: false };
endless.onDash(game);
assert.equal(noDash.failed, true);
events.update(game, 0.016);
assert.equal(game.endlessState.eventsDone, 2);
assert.equal(game.endlessState.eventsWon, 1);

game.enemies = [];
game.survivalTime = 121;
game.difficulty = 3;
game.getAdaptiveScaling = () => 1;
vm.runInContext('Math.random = () => 0', sandbox);
game.spawnEnemyWave();
assert.ok(game.enemies[0]?.isElite, 'Random elite should spawn');
assert.ok(Number.isFinite(game.enemies[0]?.hp), 'Elite HP must be finite (scope regression)');
const boss = { type: 'boss_nexus', isBoss: true, speed: 100, maxHp: 1000, hp: 1000 };
endless.decorateBoss(game, boss);
assert.equal(boss.rogueAffixes.length, 1);
assert.match(bossTitle.textContent, /量子装甲/);
game.bossCycle = 2;
game.state = 'playing';
endless.onBossDefeated(game);
assert.equal(scheduled.length, 1, 'Boss victory reward must be deferred until damage update finishes');
scheduled.shift()();
assert.equal(game.state, 'endless-choice');
assert.match(currentChoice.title, /战利品/);

game.kills = 500;
game.survivalTime = 600;
game.saveEndlessResults();
let saved = JSON.parse(stored.get('neon_endless_records_v3'));
assert.equal(saved['3'].bestStage, 2);
assert.equal(saved['3'].attempts, 1);
assert.ok(saved['3'].mostRelics >= 1);
game.saveEndlessResults();
saved = JSON.parse(stored.get('neon_endless_records_v3'));
assert.equal(saved['3'].attempts, 2);

console.log('Neon Survivor V3 tests passed: modular entry, relics, fusions, routes, timed events, elite spawn, boss affixes and rewards.');
