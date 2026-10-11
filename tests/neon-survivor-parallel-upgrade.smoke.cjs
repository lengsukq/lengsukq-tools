/* Run: node tests/neon-survivor-parallel-upgrade.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const nodes = [];
class Element {
  constructor() {
    this.children = [];
    this.classList = { active: false,
      add: () => { this.classList.active = true; },
      remove: () => { this.classList.active = false; } };
    this.style = {};
    this.parentNode = null;
    this.textContent = '';
  }
  set innerHTML(value) { this.children = []; this.html = value; }
  get innerHTML() { return this.html || ''; }
  appendChild(element) { this.children.push(element); element.parentNode = this; return element; }
  replaceChildren() { this.children = []; }
  click() { this.onclick?.(); }
}
const sandbox = {
  window: { addEventListener() {} }, console, performance: { now: () => 1000 },
  navigator: { getGamepads: () => [] },
  document: { createElement() { const node = new Element(); nodes.push(node); return node; },
    getElementById() { return null; } },
  localStorage: { getItem: () => null, setItem() {} },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
for (const file of ['rarity', 'network/experience', 'network/coop', 'core']) {
  vm.runInContext(fs.readFileSync(root + file + '.js', 'utf8'), sandbox);
}
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const Coop = sandbox.window.NeonLanCoop.Coop;
function setup(levels = 1) {
  const modal = new Element();
  const grid = new Element();
  const sent = [];
  const game = Object.assign(Object.create(proto), {
    state: 'playing', difficulty: 0, endlessMode: false, width: 400, height: 600,
    player: { x: 0, y: 0, hp: 100, maxHp: 100, level: 1 + levels,
      xp: 5, xpNeeded: 90, weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} },
    pendingLevelUps: levels, upgradeGrid: grid, modalLevelup: modal,
    banishedUpgrades: new Set(), sound: { playLevelUp() {} }, shockwaves: [],
    enemies: [], gems: [], bullets: [], enemyBullets: [], particles: [], texts: [],
    applyUpgrade(upgrade) {
      const store = upgrade.type === 'weapon' ? this.player.weapons :
        upgrade.type === 'passive' ? this.player.passives : this.player.dashUpgrades;
      store[upgrade.id] = (store[upgrade.id] || 0) + 1;
    }
  });
  const rtc = { connected: true, role: 'host',
    send(message) { sent.push(message); return true; } };
  const coop = new Coop(game, rtc);
  game.lanCoop = coop;
  coop.startHost();
  sandbox.window.NeonLanExperience.synchronizeLevel(game);
  assert.equal(coop.ally.pendingUpgrades, levels);
  game.triggerLevelUp();
  assert.equal(game.state, 'levelup');
  assert.equal(grid.children.length, 5, 'Host sees 5 cards at standard difficulty');
  assert.equal(coop.ally.choices.length, 5, 'Guest cards are ready at same time');
  const frame = sandbox.window.NeonLanCoop.snapshot(game, coop.ally, 1);
  assert.equal(frame.phase, 'levelup', 'Guest receives choices in host levelup snapshot');
  assert.equal(frame.guest.choices.length, 5);
  return { game, coop, modal, grid, sent };
}
// Guest finishes first: the host must remain paused and able to choose.
{
  const { game, coop, grid, modal } = setup();
  const guestChoice = coop.ally.choices[0];
  coop.onMessage({ type: 'upgrade_pick', id: guestChoice, seq: 1 });
  assert.equal(coop.ally.pendingUpgrades, 0);
  assert.equal(game.state, 'levelup', 'Guest cannot resume before host chooses');
  assert.equal(modal.classList.active, true);
  grid.children[0].click();
  assert.equal(game.state, 'playing');
  assert.equal(modal.classList.active, false);
  assert.equal(game.pendingLevelUps, 0);
}
// Host finishes first: waiting phase keeps game frozen until guest picks.
{
  const { game, coop, grid, modal } = setup();
  const guestChoice = coop.ally.choices[0];
  grid.children[0].click();
  assert.equal(game.state, 'coop-guest-upgrade');
  assert.equal(modal.classList.active, false);
  coop.updateHost(.21);
  assert.equal(game.state, 'coop-guest-upgrade', 'No simulation while waiting');
  coop.onMessage({ type: 'upgrade_pick', id: guestChoice, seq: 8 });
  assert.equal(game.state, 'playing', 'Only both confirmations resume game');
  coop.onMessage({ type: 'upgrade_pick', id: guestChoice, seq: 8 });
  assert.equal(coop.ally.pickedUpgradeIds.length, 1, 'Repeated choice cannot double-spend');
}
// Consecutive team level-ups retain separate queues, without early resuming.
{
  const { game, coop, grid } = setup(2);
  const firstGuest = coop.ally.choices[0];
  coop.onMessage({ type: 'upgrade_pick', id: firstGuest, seq: 1 });
  assert.equal(coop.ally.pendingUpgrades, 1);
  assert.equal(coop.ally.choices.length, 5, 'Guest keeps the same visible cards for this draft');
  grid.children[0].click();
  assert.equal(game.state, 'levelup', 'Host may choose a second DIFFERENT card');
  assert.equal(game.pendingLevelUps, 1);
  coop.onMessage({ type: 'upgrade_pick', id: firstGuest, seq: 2 });
  assert.equal(coop.ally.pendingUpgrades, 1, 'Same card cannot be bought twice in one draft');
  coop.onMessage({ type: 'upgrade_pick', id: coop.ally.choices.find(id => id !== firstGuest), seq: 3 });
  assert.equal(coop.ally.pendingUpgrades, 0);
  assert.equal(game.state, 'levelup');
  grid.children[1].click();
  assert.equal(game.pendingLevelUps, 0);
  assert.equal(game.state, 'playing');
}
// Guest still sees their modal while waiting for the host, not an empty stage.
{
  const grid = new Element();
  const modal = new Element();
  const choices = ['tesla', 'missiles', 'laser'];
  const sent = [];
  const clientGame = {
    upgradeGrid: grid, modalLevelup: modal,
    getCoopUpgradeDefinition: id => proto.getCoopUpgradeDefinition.call({}, id),
    renderUpgradeChoices(cards) { this.presented = cards; }
  };
  const client = new Coop(clientGame, {
    role: 'guest', connected: true, send(message) { sent.push(message); return true; }
  });
  client.guestMode = true;
  const frame = { phase: 'levelup', teamXP: { level: 2 },
    guest: { choices, pendingUpgrades: 1, upgradeRound: 0 } };
  client.latest = frame;
  const view = Object.create(clientGame);
  view.player = { weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} };
  client.syncGuestUpgrade(frame, view);
  assert.equal(modal.classList.active, true);
  assert.equal(view.presented.length, 3);
  assert.equal(client.pickGuestUpgrade('tesla'), true);
  assert.equal(sent[0].id, 'tesla');
  assert.match(grid.children[0].textContent, /等待房主确认/);
  frame.guest = { choices: [], pendingUpgrades: 0, upgradeRound: 1 };
  client.syncGuestUpgrade(frame, view);
  assert.match(grid.children[0].textContent, /等待房主选择/);
  assert.equal(modal.classList.active, true);
  frame.phase = 'playing';
  client.syncGuestUpgrade(frame, view);
  assert.equal(modal.classList.active, false);
}
// The real upgrade-card click path must not mutate the guest's pending levels,
// close the modal prematurely, or spend the same upgrade twice.
{
  const game = Object.create(proto);
  game.upgradeGrid = new Element();
  game.modalLevelup = new Element();
  game.player = { weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} };
  game.endlessMode = false;
  game.difficulty = 0;
  const sent = [];
  const client = new Coop(game, { role: 'guest', connected: true,
    send(packet) { sent.push(packet); return true; } });
  const frame = { phase: 'levelup', teamXP: { level: 2 },
    guest: { choices: ['tesla', 'power', 'dash_area'], upgradeRound: 1 } };
  client.latest = frame;
  client.syncGuestUpgrade(frame, Object.create(game));
  const firstCard = game.upgradeGrid.children[0];
  firstCard.click();
  firstCard.click();
  assert.equal(sent.length, 1, 'Double click must spend only one guest upgrade');
  assert.equal(sent[0].id, 'tesla');
  assert.equal(game.modalLevelup.classList.active, true,
    'Guest selection must stay on screen until host acknowledges it');
  assert.match(game.upgradeGrid.children[0].textContent, /等待房主确认/);
}
// If all guest cards are exhausted, the co-op wait cannot deadlock the room.
{
  const { game, coop, grid } = setup();
  coop.ally.pendingUpgrades = 1;
  coop.ally.choices = [];
  coop.ally.upgradeFinished = true;
  game.getCoopUpgradeChoices = () => [];
  grid.children[0].click();
  assert.equal(coop.ally.pendingUpgrades, 1, 'Guest keeps unspent chance when no valid cards exist');
  assert.equal(game.state, 'playing', 'An empty guest pool must not freeze gameplay');
}
console.log('Parallel upgrade passed: simultaneous selection, both finish orders, queued levels, guest click acknowledgment and empty-pool recovery.');
