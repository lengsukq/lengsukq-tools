/* Run: node tests/neon-survivor-pause-loadout.smoke.cjs
 *
 * The pause screen used to show one line: "装配武器 星梭织阵 Lv.1". A player
 * pausing mid-run wants to know what they are carrying and what it does, so
 * the pause modal now leads with a loadout panel: every equipped weapon,
 * module and warp specialisation with the effect text for its CURRENT level
 * plus a next-level teaser, the live action buttons read out of the combat
 * dock, and (in endless mode) relics and fusions.
 *
 * The panel must reuse the same accessors as the rest of the UI -- the ACTIVE
 * per-ship catalog, not UPGRADES_DB -- and must never print a raw card id or
 * "undefined" for an unknown card.
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
    this.classList = { contains: () => false, add() {}, remove() {}, toggle() {} };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  append(...items) { for (const item of items) this.appendChild(item); return this; }
  replaceChildren(...items) { this.children = items; for (const item of items) item.parentNode = this; }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name]; }
  addEventListener() {}
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  querySelectorAll(selector) {
    const found = [];
    const walk = node => {
      for (const child of node.children || []) {
        if (selector.startsWith('.') && (child.className || '').split(/\s+/).includes(selector.slice(1))) {
          found.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

/** Build the combat dock's skill bar the way combat-dock.js does. */
function skillBar(entries) {
  const bar = new Element('div');
  for (const { name, icon, hotkey, title } of entries) {
    const button = new Element('button');
    button.className = 'combat-skill-btn';
    button.setAttribute('title', title);
    for (const [cls, text] of [['skill-name', name], ['skill-icon', icon], ['skill-hotkey', hotkey]]) {
      const span = new Element('span');
      span.className = cls;
      span.textContent = text;
      button.appendChild(span);
    }
    bar.appendChild(button);
  }
  return bar;
}

/** What the player can actually read: tags and their attributes removed. */
const visibleText = html => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

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
neonCore.runScripts(sandbox, ['rarity', 'ships', 'ships.generated']);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);

function panel(player, extra = {}) {
  const el = new Element('div');
  byId.set('pause-loadout', el);
  const game = Object.assign(Object.create(proto), {
    difficulty: 0, endlessMode: false, endlessState: null, player
  }, extra);
  game.renderLoadoutPanel('pause-loadout');
  return el.innerHTML;
}

// ---------------------------------------------------------------------------
// Weapons: Chinese name, level, the effect for THAT level, next-level teaser.
// ---------------------------------------------------------------------------
{
  const html = panel({ shipId: 'astra', weapons: { star_weave: 1 }, passives: {}, dashUpgrades: {} });
  assert.match(html, /⚔️ 武器/, 'the weapon section must be present');
  assert.match(html, /星梭织阵/, 'the card name must be the Chinese deck name');
  assert.match(html, /Lv\.1/);
  assert.match(html, /发射追踪星梭飞弹，命中部署星锚并连线切割敌潮/,
    'level 1 must show the level-1 effect, not the generic card description');
  assert.match(html, /下一级 · 星梭升级为双发追踪弹/,
    'an un-maxed card must tease the next level');
  assert.doesNotMatch(visibleText(html), /star_weave/,
    'the raw card id must never be printed as readable text');
}

// The effect text must follow the level, not stay pinned to level 1.
{
  const html = panel({ shipId: 'astra', weapons: { star_weave: 3 }, passives: {}, dashUpgrades: {} });
  assert.match(html, /Lv\.3/);
  assert.match(html, /星梭升级为3发多目标追踪弹/, 'the effect must track the current level');
  assert.match(html, /下一级 · 星梭升级为4发多目标追踪弹/);
  assert.doesNotMatch(html, /发射追踪星梭飞弹，命中部署星锚/, 'the level-1 text must be gone');
}

// A maxed card shows no teaser and is marked as finished.
{
  const html = panel({ shipId: 'astra', weapons: { star_weave: 5 }, passives: {}, dashUpgrades: {} });
  assert.match(html, /已满级/);
  assert.doesNotMatch(html, /下一级/, 'a maxed card must not tease a level that does not exist');
  assert.match(html, /终极织阵/, 'the level-5 effect must be shown');
}

// Limit breaks are surfaced next to the level.
{
  const html = panel({
    shipId: 'astra', weapons: { star_weave: 5 }, passives: {}, dashUpgrades: {},
    limitBreaks: { star_weave: 3 }
  });
  assert.match(html, /\+3 破限/, 'limit breaks must be visible while paused');
}

// ---------------------------------------------------------------------------
// Modules and warp specialisations, with the ship's own wording and limits.
// ---------------------------------------------------------------------------
{
  const html = panel({
    shipId: 'astra',
    weapons: { star_weave: 1 }, passives: { star_talisman: 2 },
    dashUpgrades: { star_gate: 1 }
  });
  assert.match(html, /🔷 模组/);
  assert.match(html, /星能护符/);
  assert.match(html, /最大星能\+40/, 'the module effect must match its level');
  assert.match(html, /✨ 相位强化/, 'astra traverses by phase shift, not warp');
  assert.match(html, /星门储能/);
  assert.doesNotMatch(visibleText(html), /star_talisman|star_gate/, 'no raw ids on screen');
}
{
  const html = panel({
    shipId: 'phantom', weapons: { phantom_scythe: 1 }, passives: {}, dashUpgrades: {}
  });
  assert.match(html, /👻 潜行强化/, 'phantom traverses by stealth');
  assert.match(html, /噬魂灵球/);
  assert.doesNotMatch(visibleText(html), /phantom_scythe/);
}
{
  const html = panel({
    shipId: 'riftblade', weapons: { blaster: 2 }, passives: {}, dashUpgrades: { dash_fire: 1 }
  });
  assert.match(html, /⚡ 折跃强化/);
  assert.match(html, /脉冲离子炮/);
}

// ---------------------------------------------------------------------------
// Slot accounting: the count badge and the dashed placeholders agree.
// ---------------------------------------------------------------------------
{
  const html = panel({
    shipId: 'astra', weapons: { star_weave: 1, prism_split: 1 }, passives: {}, dashUpgrades: {}
  });
  assert.match(html, /武器[\s\S]*?2\/4/, 'two of four weapon slots are used');
  const empties = (html.match(/loadout-card is-empty/g) || []).length;
  // 2 spare weapon slots + 4 spare module slots + 7 spare warp slots.
  assert.equal(empties, 2 + 4 + 7, 'every remaining slot must be shown as a placeholder');
  assert.match(html, /空槽位 · 升级时可装入新武器/);
}

// ---------------------------------------------------------------------------
// Skills come from the combat dock, so the two can never disagree.
// ---------------------------------------------------------------------------
{
  byId.set('ship-skills-bar', skillBar([
    { name: '天界结界', icon: '🛡️', hotkey: 'J',
      title: '天界结界 [J]：开启/关闭重装移动炮台，自身增伤+70%' },
    { name: '苍穹星陨', icon: '☄️', hotkey: 'K',
      title: '苍穹星陨 [K]：无冷却定点轰炸，固定消耗12星能/发' }
  ]));
  const html = panel({ shipId: 'astra', weapons: {}, passives: {}, dashUpgrades: {} });
  assert.match(html, /🎮 技能与操作/);
  assert.match(html, /天界结界/);
  assert.match(html, /苍穹星陨/);
  assert.match(html, /开启\/关闭重装移动炮台，自身增伤\+70%/,
    'the effect sentence must be carried over from the dock button title');
  assert.doesNotMatch(html, /天界结界 \[J\]：/, 'the name and hotkey are already shown once');
  byId.delete('ship-skills-bar');
}

// A missing dock degrades to no skill section instead of throwing.
{
  const html = panel({ shipId: 'astra', weapons: { star_weave: 1 }, passives: {}, dashUpgrades: {} });
  assert.doesNotMatch(html, /🎮 技能与操作/, 'no dock, no skill section');
  assert.match(html, /星梭织阵/, 'the rest of the panel still renders');
}

// ---------------------------------------------------------------------------
// Endless mode: relics and fusions are effects too.
// ---------------------------------------------------------------------------
{
  const relic = { id: 'glass_reactor', name: '玻璃反应堆', rarity: 'rare',
    desc: '武器伤害 +35%，但最大生命值 -25%。' };
  const fusion = { id: 'storm_lance', name: '电弧裁决', rarity: 'legendary',
    requires: ['tesla', 'laser'], desc: '闪电与激光命中后弹射额外电弧。' };
  sandbox.window.NeonRogueRelics = { definitions: [relic] };
  sandbox.window.NeonRogueFusions = { recipes: [fusion] };
  const html = panel(
    { shipId: 'riftblade', weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} },
    { endlessMode: true, endlessState: { relics: ['glass_reactor'], fusions: ['storm_lance'] } });
  assert.match(html, /♾️ 遗物与融合/);
  assert.match(html, /玻璃反应堆/);
  assert.match(html, /武器伤害 \+35%/, 'the relic effect must be spelled out');
  assert.match(html, /电弧裁决/);
  assert.match(html, /闪电与激光命中后弹射额外电弧/);
  assert.doesNotMatch(visibleText(html), /glass_reactor|storm_lance/,
    'no raw relic or fusion ids on screen');
}

// Normal mode must not advertise an empty endless section.
{
  const html = panel({ shipId: 'riftblade', weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} });
  assert.doesNotMatch(html, /遗物与融合/);
}

// ---------------------------------------------------------------------------
// Unknown data degrades safely.
// ---------------------------------------------------------------------------
{
  const html = panel({ shipId: 'astra', weapons: { not_a_real_card: 2 }, passives: {}, dashUpgrades: {} });
  assert.match(html, /未知装备/, 'an unknown card falls back to a readable label');
  assert.doesNotMatch(visibleText(html), /not_a_real_card/, 'and never to its internal id');
  assert.doesNotMatch(visibleText(html), /undefined/, 'and never to undefined');
}

// The panel is a prototype method and must not be enumerable: network/world-view.js
// builds guest views with Object.create(game).
{
  assert.equal(typeof proto.renderLoadoutPanel, 'function');
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'renderLoadoutPanel');
  assert.equal(descriptor.enumerable, false, 'mixed-in methods stay non-enumerable');
}

// ---------------------------------------------------------------------------
// pauseGame() must actually fill the panel, and must still open the modal.
// ---------------------------------------------------------------------------
{
  const panelEl = new Element('div');
  byId.set('pause-loadout', panelEl);
  const modal = new Element('div');
  modal.classList = { active: false, add() { this.active = true; }, remove() {}, contains: () => false };
  const game = Object.assign(Object.create(proto), {
    state: 'playing', difficulty: 0, endlessMode: false, endlessState: null,
    modalPause: modal,
    player: { shipId: 'astra', weapons: { star_weave: 2 }, passives: {}, dashUpgrades: {} },
    releaseJoystickTouch() {},
    renderStatsTable() { throw new Error('stats table must not block the loadout'); }
  });
  // A broken stats table must be reported, not swallowed, and must not take
  // the loadout or the modal down with it.
  const realError = console.error;
  let reported = 0;
  console.error = () => { reported++; };
  try { game.pauseGame(); } finally { console.error = realError; }
  assert.equal(game.state, 'paused');
  assert.match(panelEl.innerHTML, /星梭织阵/, 'pausing must fill the loadout panel');
  assert.match(panelEl.innerHTML, /星梭升级为双发追踪弹/, 'and with the live level');
  assert.equal(reported, 1, 'the stats-table failure must be reported');
  assert.equal(modal.classList.active, true,
    'a failing stats table must not keep the pause modal from opening');
}

console.log('Pause loadout passed: per-level weapon/module/warp effects, slot '
  + 'placeholders, dock-sourced skills, endless relics and fusions, safe fallbacks.');
