/* Run: node tests/neon-survivor-legendary-pity.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/js/';

class Element {
  constructor() {
    this.children = [];
    this.style = {};
    this.classList = { add() {}, remove() {} };
    this.parentNode = null;
    this.textContent = '';
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  replaceChildren() { this.children = []; }
  querySelector() { return null; }
  click() { this.onclick?.(); }
}
const sandbox = {
  window: { addEventListener() {} }, console, performance: { now: () => 500 },
  navigator: { getGamepads: () => [] },
  document: { createElement: () => new Element(), getElementById: () => null },
  localStorage: { getItem: () => null, setItem() {} },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['network/schema','rarity', 'endless', 'network/experience', 'network/coop']);
// Natural rolls choose common cards; only the pity rule may force legendary.
vm.runInContext('Math.random = () => 0', sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const rarity = sandbox.window.NeonUpgradeRarity;
const Coop = sandbox.window.NeonLanCoop.Coop;
assert.equal(rarity.PITY_LEVEL, 10);

function gameAt(level, difficulty = 0) {
  return Object.assign(Object.create(proto), {
    state: 'playing', difficulty, endlessMode: false,
    width: 500, height: 700, survivalTime: 30, kills: 10,
    player: { x: 0, y: 0, hp: 100, maxHp: 100, level, xp: 5, xpNeeded: 100,
      weapons: { blaster: 1 }, passives: {}, dashUpgrades: {}, limitBreaks: {} },
    pendingLevelUps: 1, modalLevelup: new Element(), upgradeGrid: new Element(),
    sound: { playLevelUp() {} }, shockwaves: [], banishedUpgrades: new Set(),
    enemies: [], bullets: [], enemyBullets: [], gems: [], particles: [], texts: [],
    mines: [], orbiters: [], laserBeams: [], blackHoles: [], companionDrones: [],
    applyUpgrade(upgrade) {
      const field = upgrade.type === 'weapon' ? 'weapons' :
        upgrade.type === 'passive' ? 'passives' : 'dashUpgrades';
      this.player[field][upgrade.id] = (this.player[field][upgrade.id] || 0) + 1;
    }
  });
}
const legendaryFrom = cards => cards.find(card => card.pityGuaranteed);

// Nothing is guaranteed at level 9, even with very unfavorable RNG.
{
  const game = gameAt(9);
  game.triggerLevelUp();
  assert.equal(legendaryFrom(game.currentUpgradeChoices), undefined);
  assert.ok(game.currentUpgradeChoices.every(card => card.rarity === 'common'));
}

// Level 10 guarantees an eligible card, and retains it until ACTUALLY chosen.
{
  const game = gameAt(10, 6);
  const coop = new Coop(game, { role: 'host', connected: true, send: () => true });
  game.lanCoop = coop;
  coop.startHost();
  coop.ally.level = 10;
  coop.ally.pendingUpgrades = 1;
  game.triggerLevelUp();
  assert.equal(legendaryFrom(game.currentUpgradeChoices)?.rarity, 'legendary');
  assert.equal(game.currentUpgradeChoices.length, 3);
  assert.equal(coop.ally.choices.includes(coop.ally.legendaryPityId), true,
    'Guest separately receives a legendary card at ascension VI');

  const frame = sandbox.window.NeonLanCoop.snapshot(game, coop.ally, 1);
  assert.equal(frame.guest.legendaryPityId, coop.ally.legendaryPityId);
  const clientGame = gameAt(10, 6);
  const client = new Coop(clientGame, { role: 'guest', connected: true, send: () => true });
  client.latest = frame;
  const view = Object.create(clientGame);
  view.player = { weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} };
  client.syncGuestUpgrade(frame, view);
  assert.ok(clientGame.upgradeGrid.children.some(card => /传说保底/.test(card.innerHTML)),
    'The guest sees the guaranteed-card label');

  const guestNormal = coop.ally.choices.find(id => id !== coop.ally.legendaryPityId);
  coop.onMessage({ type: 'upgrade_pick', id: guestNormal, seq: 1 });
  assert.equal(rarity.hasLegendary(coop.ally, game.levelupEligible), false);
  const hostNormal = game.currentUpgradeChoices.findIndex(card => card.rarity !== 'legendary');
  game.upgradeGrid.children[hostNormal].click();
  assert.equal(game.state, 'levelup', 'Preview alone must not apply a non-legendary');
  game.confirmUpgradePreview();
  assert.equal(game.state, 'playing');

  game.player.level = 11;
  game.pendingLevelUps = 1;
  coop.ally.level = 11;
  coop.ally.pendingUpgrades = 1;
  game.triggerLevelUp();
  assert.ok(legendaryFrom(game.currentUpgradeChoices), 'Guarantee repeats if unchosen');
  assert.ok(coop.ally.legendaryPityId, 'Guest retains independent guarantee');

  const legendaryId = coop.ally.legendaryPityId;
  coop.onMessage({ type: 'upgrade_pick', id: legendaryId, seq: 2 });
  assert.ok(coop.ally.weapons[legendaryId] || coop.ally.passives[legendaryId] ||
    coop.ally.dashUpgrades[legendaryId], 'Guest actually owns the legendary');
  game.upgradeGrid.children[0].click(); // first host card is the guaranteed legendary
  assert.equal(game.state, 'levelup', 'Even the guaranteed legendary requires confirmation');
  game.confirmUpgradePreview();
  assert.equal(game.state, 'playing');
  assert.ok(rarity.hasLegendary(game.player, game.levelupEligible));

  game.player.level = 12;
  game.pendingLevelUps = 1;
  coop.ally.level = 12;
  coop.ally.pendingUpgrades = 1;
  game.triggerLevelUp();
  assert.equal(legendaryFrom(game.currentUpgradeChoices), undefined,
    'After obtaining first legendary, normal rarity odds resume for host');
  assert.equal(coop.ally.legendaryPityId, null,
    'After obtaining first legendary, normal rarity odds resume for guest');
}

// No illegal forced card if the eligible pool has no legendary (e.g. banished).
{
  const game = gameAt(10, 6);
  game.banishedUpgrades = new Set(['nova', 'blackhole', 'crit', 'multishot',
    'dash_aegis', 'dash_blast']);
  game.triggerLevelUp();
  assert.equal(legendaryFrom(game.currentUpgradeChoices), undefined);
  assert.equal(game.currentUpgradeChoices.length, 3);
}

// An endless reroll cannot silently lose the guaranteed legendary simply
// because the current card was excluded from the alternative pool.
{
  const game = gameAt(10);
  game.endlessMode = true;
  game.levelupEligible = [
    { id: 'nova', type: 'weapon', rarity: 'legendary' },
    { id: 'blaster', type: 'weapon', rarity: 'common' },
    { id: 'haste', type: 'passive', rarity: 'common' },
    { id: 'power', type: 'passive', rarity: 'common' },
    { id: 'magnet', type: 'passive', rarity: 'common' }
  ];
  game.currentUpgradeChoices = game.levelupEligible.slice(0, 2);
  assert.equal(game.nextEndlessUpgradeChoices()[0].id, 'nova');
}
console.log('Legendary pity passed: level 9 no guarantee; level 10 host/guest; unpicked carry-over; acquired reset; ascension VI; exhausted pool; endless reroll.');
