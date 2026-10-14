/* Run: node tests/neon-survivor-ui-labels.smoke.cjs
 *
 * Player-facing text must never print an internal identifier or a raw English
 * enum token. Four real leaks, all found by reading the shipped UI:
 *
 *  1. hud.js renderStatsTable() resolved equipped-weapon names against the
 *     global UPGRADES_DB only. Astra and Phantom register their own decks
 *     (ships.js registerUpgradeCatalog), so they are absent from UPGRADES_DB
 *     and the pause / game-over / victory tables fell through to the raw id:
 *     "star_weave Lv.1" instead of "星梭织阵 Lv.1".
 *  2. upgrade-panel.js rendered `${upg.rarity}` straight into the level-up
 *     card badge ("common"/"rare"/"legendary") plus the English literals
 *     "WARP UPGRADE" / "STEALTH UPGRADE" / "LIMIT BREAK".
 *  3. render/world.js drew the literal "★ELITE" over elite enemies, while the
 *     rest of the game calls them 精英.
 *  4. ship-selection.js's documented new-ship fallback interpolated
 *     ship.startingWeapon, i.e. an internal weapon id.
 *
 * This asserts on rendered strings and recorded canvas calls, so it needs no
 * browser.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

class Element {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.style = {};
    this.attrs = {};
    this.textContent = '';
    this.id = '';
    this.classList = {
      contains: name => (this.className || '').split(/\s+/).includes(name),
      add: name => { this.className = ((this.className || '') + ' ' + name).trim(); },
      remove: name => { this.className = (this.className || '').split(/\s+/).filter(x => x !== name).join(' '); },
      toggle() {}
    };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  append(...items) { for (const item of items) this.appendChild(item); return this; }
  replaceChildren(...items) { this.children = items; for (const item of items) item.parentNode = this; }
  querySelector(selector) { return this.children.find(item => `#${item.id}` === selector) || null; }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name]; }
  addEventListener() {}
  removeEventListener() {}
  getContext() { return null; }
  focus() {}
  select() {}
  click() { this.onclick?.(); }
}

/** Every string this node (or a descendant) would put on screen. */
function textOf(node) {
  const parts = [node.textContent || '', node.innerHTML || ''];
  for (const child of node.children || []) parts.push(textOf(child));
  return parts.join('\n');
}

const byId = new Map();
const sandbox = {
  window: { addEventListener() {} },
  document: {
    createElement: tag => new Element(tag),
    getElementById: id => byId.get(id) || null,
    querySelectorAll: () => [],
    addEventListener() {}
  },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 0 }, console,
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
// Ships (and their generated bundle) own the per-ship decks; ship-selection
// consumes the registry, so both are needed. rarity.js feeds the card rolls.
neonCore.runScripts(sandbox, ['rarity', 'ships', 'ships.generated', 'ship-selection']);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const registry = sandbox.window.NeonShips;
const UPGRADES_DB = vm.runInContext('UPGRADES_DB', sandbox);
const LABELS = vm.runInContext('NEON_RARITY_LABELS', sandbox);

// ---------------------------------------------------------------------------
// 1. The stats table resolves names through the ship's OWN deck.
// ---------------------------------------------------------------------------
function statsGame(shipId, weapons) {
  const el = new Element('div');
  byId.set('pause-stats', el);
  return Object.assign(Object.create(proto), {
    difficulty: 0, endlessMode: false, endlessState: null,
    survivalTime: 125, kills: 40, totalDamageDealt: 12345,
    combatTelemetry: { invulnerableSeconds: 3, preciseDashes: 2, nukeDrops: 1, damageTaken: 88 },
    player: { shipId, weapons, passives: {}, level: 7, crystals: 19 }
  });
}

// Astra: star_weave is NOT in UPGRADES_DB, so this is the exact reported bug.
{
  const game = statsGame('astra', { star_weave: 1 });
  game.renderStatsTable('pause-stats');
  const html = byId.get('pause-stats').innerHTML;
  assert.match(html, /星梭织阵 Lv\.1/, 'astra weapons must show their Chinese card name');
  assert.doesNotMatch(html, /star_weave/, 'the raw internal weapon id must never reach the table');
}

// Phantom: same registry path, different deck.
{
  const game = statsGame('phantom', { phantom_scythe: 3 });
  game.renderStatsTable('pause-stats');
  const html = byId.get('pause-stats').innerHTML;
  assert.match(html, /噬魂灵球 Lv\.3/, 'phantom weapons must show their Chinese card name');
  assert.doesNotMatch(html, /phantom_scythe/, 'the raw internal weapon id must never reach the table');
}

// Riftblade keeps using the legacy global table.
{
  const game = statsGame('riftblade', { blaster: 2 });
  game.renderStatsTable('pause-stats');
  assert.match(byId.get('pause-stats').innerHTML, /脉冲离子炮 Lv\.2/,
    'the original ship must keep resolving against UPGRADES_DB');
}

// Multiple weapons stay comma separated and every one is named.
{
  const game = statsGame('astra', { star_weave: 1, prism_split: 2 });
  game.renderStatsTable('pause-stats');
  const html = byId.get('pause-stats').innerHTML;
  assert.match(html, /星梭织阵 Lv\.1/);
  assert.match(html, /棱镜分光 Lv\.2/);
  assert.doesNotMatch(html, /prism_split/);
}

// The same table backs the game-over and victory screens.
{
  const game = statsGame('astra', { star_weave: 2 });
  byId.set('gameover-stats', new Element('div'));
  byId.set('victory-stats', new Element('div'));
  game.renderStatsTable('gameover-stats');
  game.renderStatsTable('victory-stats');
  for (const id of ['gameover-stats', 'victory-stats']) {
    assert.match(byId.get(id).innerHTML, /星梭织阵 Lv\.2/, `${id} must be translated too`);
    assert.doesNotMatch(byId.get(id).innerHTML, /star_weave/);
  }
}

// ---------------------------------------------------------------------------
// 2. The level-up card badge is Chinese, never a raw enum token.
// ---------------------------------------------------------------------------
function cardGame(shipId) {
  const grid = new Element('div');
  const container = new Element('div');
  container.appendChild(grid);
  return Object.assign(Object.create(proto), {
    difficulty: 0, endlessMode: false,
    player: { shipId, weapons: {}, passives: {}, dashUpgrades: {}, level: 3 },
    upgradeGrid: grid, pendingUpgradeId: null, currentUpgradeChoices: [],
    banishedUpgrades: new Set(), upgradeSession: { picked: new Set(), capacity: 1 },
    pendingLevelUps: 1
  });
}
const badgeOf = card => {
  const match = /<div class="rarity-tag"[^>]*>([^<]*)<\/div>/.exec(card.innerHTML);
  assert.ok(match, 'every card must still render a rarity badge');
  return match[1];
};
const card = (id, rarity, extra = {}) => ({
  id, rarity, type: 'weapon', name: `卡${id}`, desc: '说明', icon: '◇', statText: ['一级'], ...extra
});

{
  const game = cardGame('riftblade');
  game.renderUpgradeChoices([
    card('a', 'common'), card('b', 'rare'), card('c', 'legendary')
  ]);
  const badges = game.upgradeGrid.children.map(badgeOf);
  assert.deepEqual(Array.from(badges), ['普通', '稀有', '传说'],
    'the badge must use the same Chinese tiers as the subtitle copy');
  const rendered = game.upgradeGrid.children.map(node => node.innerHTML).join('\n');
  for (const token of ['common', 'rare', 'legendary', 'UPGRADE', 'LIMIT BREAK']) {
    assert.ok(!rendered.includes(token), `the card must not print the token "${token}"`);
  }
}

// A dash card names the ship's own traversal verb.
{
  const rift = cardGame('riftblade');
  rift.renderUpgradeChoices([card('d', 'rare', { type: 'dash' })]);
  assert.equal(badgeOf(rift.upgradeGrid.children[0]), '折跃强化');

  const phantom = cardGame('phantom');
  phantom.renderUpgradeChoices([card('d', 'rare', { type: 'dash' })]);
  assert.equal(badgeOf(phantom.upgradeGrid.children[0]), '潜行强化',
    'phantom traverses by stealth, not by warp');
}

// Limit-break cards use the same wording as their generated card name.
{
  const game = cardGame('riftblade');
  game.renderUpgradeChoices([
    card('lb', 'legendary', { type: 'limit_break', subType: 'weapon', lbCount: 1 })
  ]);
  assert.equal(badgeOf(game.upgradeGrid.children[0]), '超频破限');
}

// Pity keeps its own badge and is unaffected.
{
  const game = cardGame('riftblade');
  game.renderUpgradeChoices([card('p', 'legendary', { pityGuaranteed: true })]);
  assert.equal(badgeOf(game.upgradeGrid.children[0]), '★ 传说保底');
}

// The label table must stay total over every rarity the game can ship.
{
  const rarities = new Set(UPGRADES_DB.map(entry => entry.rarity));
  for (const shipId of ['astra', 'phantom']) {
    for (const entry of registry.upgradeCatalogFor({ shipId }) || []) rarities.add(entry.rarity);
  }
  assert.ok(rarities.size >= 3, 'the three tiers must all be present in the shipped data');
  for (const rarity of rarities) {
    assert.ok(LABELS[rarity], `rarity "${rarity}" has no Chinese label`);
  }
  assert.deepEqual(Array.from(Object.keys(LABELS).sort()), ['common', 'legendary', 'rare'],
    'the label table must not grow stale names');
}

// ---------------------------------------------------------------------------
// 3. Elite enemies are labelled in Chinese on the canvas.
// ---------------------------------------------------------------------------
{
  const METHODS = ['save', 'restore', 'beginPath', 'fill', 'stroke', 'arc', 'moveTo',
    'lineTo', 'closePath', 'rect', 'fillRect', 'translate', 'rotate', 'setLineDash', 'fillText'];
  const calls = [];
  const ctx = { calls, font: '', textAlign: '', fillStyle: '', strokeStyle: '', lineWidth: 0, shadowBlur: 0 };
  for (const name of METHODS) ctx[name] = (...args) => calls.push([name, ...args]);
  ctx.setLineDash = (...args) => calls.push(['setLineDash', ...args]);
  // Assigning font/textAlign/fillStyle must not be recorded as calls.
  Object.defineProperty(ctx, 'font', { value: '', writable: true });
  Object.defineProperty(ctx, 'textAlign', { value: '', writable: true });
  Object.defineProperty(ctx, 'fillStyle', { value: '', writable: true });
  Object.defineProperty(ctx, 'strokeStyle', { value: '', writable: true });
  Object.defineProperty(ctx, 'lineWidth', { value: 0, writable: true });
  Object.defineProperty(ctx, 'shadowBlur', { value: 0, writable: true });
  Object.defineProperty(ctx, 'shadowColor', { value: '', writable: true });

  const game = Object.assign(Object.create(proto), {
    survivalTime: 1, player: { x: 0, y: 0 },
    enemies: [{ x: 0, y: 0, radius: 18, color: '#ff0055', type: 'swarmer',
      hp: 50, maxHp: 50, isElite: true }]
  });
  game.renderEnemies(ctx, () => true);
  const labels = calls.filter(call => call[0] === 'fillText').map(call => call[1]);
  assert.deepEqual(labels, ['★精英'], 'the elite badge must be Chinese, like the rest of the game');
  assert.ok(!labels.some(text => /ELITE/i.test(text)), 'no English elite badge may remain');

  // The help panel documents this badge, so it must name it the same way.
  const helpHtml = require('node:fs').readFileSync(
    require('node:path').join(neonCore.ROOT, 'index.html'), 'utf8');
  assert.ok(!helpHtml.includes('★ELITE'),
    'the manual must not document a badge the game no longer draws');
  assert.ok(helpHtml.includes('★精英'), 'the manual must document the badge the game draws');
}

// ---------------------------------------------------------------------------
// 4. The ship picker never falls back to a raw weapon id.
// ---------------------------------------------------------------------------
{
  // A ship added by a future character directory: playable, own deck, and
  // deliberately absent from ship-selection.js's ARCHETYPES table.
  const NEW_SHIP = 'labeltest';
  registry.register({
    id: NEW_SHIP, code: 'LABELTEST', name: '测试舰·占位', description: '仅用于标签回归测试',
    playable: true, baseStats: { hp: 90, speed: 230, regen: 0.8, dashCharges: 2 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 0 },
    startingWeapon: 'labeltest_bolt', passiveId: null, activeSkillIds: [],
    warpTreeId: 'phase', rendererId: 'riftblade'
  });
  registry.registerUpgradeCatalog(NEW_SHIP, [
    { id: 'labeltest_bolt', type: 'weapon', rarity: 'common', name: '测试脉冲炮', maxLvl: 5 }
  ]);

  const root = new Element('div');
  byId.set('neon-ship-selector', root);
  sandbox.window.NeonShipSelection.render({ selectedShipId: NEW_SHIP });

  const cards = root.children.flatMap(section => section.children || [])
    .filter(node => node.attrs?.['data-code'] === 'LABELTEST');
  assert.equal(cards.length, 1, 'the new ship must appear in the picker');
  const text = textOf(cards[0]);
  assert.match(text, /测试脉冲炮/, 'the starting weapon must show its registered Chinese name');
  assert.doesNotMatch(text, /labeltest_bolt/, 'the raw internal weapon id must never reach the card');
}

console.log('UI labels passed: ship-owned weapon names, Chinese rarity badges, '
  + 'Chinese elite badge, no internal ids in the ship picker.');
