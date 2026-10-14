/* Run: node tests/neon-survivor-upgrade-bank.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/js/';
class Element {
  constructor() {
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.classList = { add() {}, remove() {} };
    this.style = {};
  }
  set innerHTML(markup) { this.markup = markup; this.children = []; }
  get innerHTML() { return this.markup || ''; }
  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  replaceChildren() { this.children = []; }
  querySelector(selector) { return this.children.find(node => '#' + node.id === selector) || null; }
  click() { this.onclick?.(); }
}
const sandbox = {
  window: { addEventListener() {} }, console, performance: { now: () => 1000 },
  navigator: { getGamepads: () => [] },
  document: { createElement: () => new Element(), getElementById: () => null },
  localStorage: { getItem: () => null, setItem() {} },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['rarity', 'network/experience', 'network/coop']);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const Coop = sandbox.window.NeonLanCoop.Coop;
function create(difficulty, level = 2, credits = 1) {
  const grid = new Element();
  const card = new Element();
  card.appendChild(grid);
  const game = Object.assign(Object.create(proto), {
    state: 'playing', width: 600, height: 600, difficulty,
    player: { x: 0, y: 0, level, hp: 100, maxHp: 100, xp: 0, xpNeeded: 100,
      weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} },
    pendingLevelUps: credits, upgradeGrid: grid, modalLevelup: card,
    endlessMode: false, shockwaves: [], enemies: [], particles: [],
    bullets: [], enemyBullets: [], gems: [], sound: { playLevelUp() {} },
    banishedUpgrades: new Set(),
    applyUpgrade(upgrade) {
      const bag = upgrade.type === 'weapon' ? this.player.weapons :
        upgrade.type === 'passive' ? this.player.passives : this.player.dashUpgrades;
      bag[upgrade.id] = (bag[upgrade.id] || 0) + 1;
    }
  });
  return game;
}
const bankButton = game => game.upgradeGrid.parentNode.querySelector('#upgrade-bank-actions')
  .children.find(node => node.type === 'button' && /保留剩余|完成选择/.test(node.textContent));
const choose = (game, index) => {
  const before = game.pendingLevelUps;
  game.upgradeGrid.children[index].click();
  assert.equal(game.pendingLevelUps, before, 'Preview never spends credits');
  assert.equal(game.confirmUpgradePreview(), true);
};
// Difficulty changes both host and guest selection width, never the 3-pick cap.
for (const [tier, expected] of [[0, 5], [2, 5], [3, 4], [4, 4], [5, 3], [6, 3]]) {
  const game = create(tier);
  assert.equal(game.getUpgradeChoiceCount(), expected);
  game.triggerLevelUp();
  assert.equal(game.currentUpgradeChoices.length, expected);
  assert.equal(game.upgradeGrid.children.length, expected);
  assert.match(bankButton(game).textContent, /保留剩余 1 次/);
}
// The entire point may be saved until another level and spent then.
{
  const game = create(0);
  game.triggerLevelUp();
  bankButton(game).click();
  assert.equal(game.pendingLevelUps, 1);
  assert.equal(game.state, 'playing');
  game.player.level++;
  game.pendingLevelUps++;
  game.triggerLevelUp();
  assert.equal(game.upgradeSession.capacity, 2);
  const first = game.currentUpgradeChoices[0];
  choose(game, 0);
  assert.equal(game.pendingLevelUps, 1);
  game.upgradeGrid.children[0].click();
  assert.equal(game.pendingLevelUps, 1, 'Same card twice must not spend another credit');
  assert.equal(game.state, 'levelup', 'One credit remains usable in the current draft');
  bankButton(game).click();
  assert.equal(game.state, 'playing');
  assert.equal(game.pendingLevelUps, 1, 'Remaining credit is carried to the next level');
  assert.ok(first.id);
}
// Four stored opportunities: spend at most three DIFFERENT ones now, keep one.
{
  const game = create(0, 12, 4);
  game.triggerLevelUp();
  const before = game.currentUpgradeChoices.map(card => card.id);
  choose(game, 0);
  choose(game, 1);
  assert.equal(game.pendingLevelUps, 2);
  assert.equal(game.state, 'levelup');
  choose(game, 2);
  assert.equal(game.pendingLevelUps, 1, 'Fourth credit is retained for a later level');
  assert.equal(game.state, 'playing');
  assert.equal(new Set(before.slice(0, 3)).size, 3);
}
// Co-op: both pilots may store unspent credits; host must not wait forever.
{
  const game = create(3, 3, 2);
  const sent = [];
  const host = new Coop(game, { role: 'host', connected: true,
    send(packet) { sent.push(packet); return true; } });
  game.lanCoop = host;
  host.startHost();
  host.ally.level = 3;
  host.ally.pendingUpgrades = 2;
  game.triggerLevelUp();
  assert.equal(host.ally.choices.length, 4);
  assert.equal(host.ally.upgradeCapacity, 2);
  const guestChoice = host.ally.choices[0];
  host.onMessage({ type: 'upgrade_pick', seq: 1, id: guestChoice });
  assert.equal(host.ally.pendingUpgrades, 1);
  host.onMessage({ type: 'upgrade_pick', seq: 2, id: guestChoice });
  assert.equal(host.ally.pendingUpgrades, 1, 'Guest cannot pick same skill again');
  host.onMessage({ type: 'upgrade_done', seq: 3 });
  assert.equal(host.ally.pendingUpgrades, 1, 'Guest chose to bank one credit');
  bankButton(game).click();
  assert.equal(game.pendingLevelUps, 2, 'Host chose to bank both credits');
  assert.equal(game.state, 'playing', 'Both pilots can bank and resume');
  host.updateHost(.1);
  assert.equal(game.state, 'playing', 'Saved credits must not open a phantom draft');

  game.player.level++;
  game.pendingLevelUps++;
  host.ally.level++;
  host.ally.pendingUpgrades++;
  game.triggerLevelUp();
  assert.equal(game.upgradeSession.capacity, 3);
  assert.equal(host.ally.upgradeCapacity, 2);
  assert.equal(host.ally.choices.length, 4);
  assert.equal(game.state, 'levelup');
}
// Guest button uses the reliable protocol, not local-only UI closure.
{
  const game = create(0, 10, 0);
  const packets = [];
  const client = new Coop(game, { role: 'guest', connected: true,
    send(packet) { packets.push(packet); return true; } });
  const frame = { phase: 'levelup', teamXP: { level: 10 },
    guest: { choices: ['nova','tesla','missiles','power','dash_charge'],
      pendingUpgrades: 2, upgradeCapacity: 2, upgradeRound: 1, pickedUpgradeIds: [],
      upgradeFinished: false } };
  client.latest = frame;
  const view = Object.create(game);
  view.player = { weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} };
  client.syncGuestUpgrade(frame, view);
  assert.equal(game.upgradeGrid.children.length, 5);
  bankButton(game).click();
  assert.equal(packets[0].type, 'upgrade_done');
  assert.equal(client.requestGuestUpgradeFinish(), false, 'Second finish while awaiting ACK is blocked');
}
console.log('Upgrade bank passed: 5/4/3 cards, bank-and-return, unique multi-pick max 3, concurrent co-op saved credits and safe resume.');
