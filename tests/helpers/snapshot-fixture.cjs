/* A deliberately rich co-op world for snapshot contract tests.
 *
 * Every replicated field is populated with a distinctive value so a missing or
 * renamed field is visible, and every entity array is filled past its declared
 * cap so the producer's limits and the validator's limits are exercised
 * together. Shared by the byte-identity check and the schema test so both
 * describe the same world.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../../public/Game/neon-survivor');
const read = part => fs.readFileSync(path.join(ROOT, part), 'utf8');

/** Sandbox with the whole network + ship stack loaded, in page order. */
function sandbox() {
  const box = {
    window: { addEventListener() {} },
    document: {
      getElementById() { return null; },
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
      querySelectorAll: () => [],
      body: { classList: { add() {}, remove() {} } },
      addEventListener() {}
    },
    navigator: { getGamepads() { return []; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    performance: { now: () => 1000 }, console,
    setTimeout, clearTimeout, setInterval, clearInterval
  };
  vm.createContext(box);
  // Ships own the per-ship network projections; core owns the shared rules.
  const ordered = [
    'js/ships.js', 'js/ships.generated.js', 'js/players.js',
    'js/combat/pilots.js',
    'js/core/simulation/speed.js'
  ];
  for (const part of ordered) vm.runInContext(read(part), box, { filename: part });
  // Network modules in page order. schema.js is the contract under test.
  for (const part of ['schema', 'roster', 'ready', 'multiplayer-rules', 'snapshots',
    'resonance', 'experience', 'revive', 'world-view', 'prediction', 'coop']) {
    const file = `js/network/${part}.js`;
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    vm.runInContext(read(file), box, { filename: file });
  }
  return box;
}

/** Every entity array and the fields the host replicates for it.
 *
 * Used as the fixture's own description of the world before the schema module
 * exists (so the pre-refactor byte baseline can be captured), and afterwards
 * the fixture reads the same list out of SnapshotSchema instead. */
const FALLBACK_ARRAYS = Object.freeze([
  { name: 'enemies', fields: ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'radius', 'color',
    'type', 'isBoss', 'isElite', 'hasShield', 'arming', 'aimTimer', 'coopCapture', 'coopExposed'] },
  { name: 'bullets', fields: ['x', 'y', 'vx', 'vy', 'radius', 'color', 'type', 'isLevel5'] },
  { name: 'enemyBullets', fields: ['x', 'y', 'radius', 'color', 'damage'] },
  { name: 'gems', fields: ['x', 'y', 'radius', 'type', 'color', 'value'] },
  { name: 'shockwaves', fields: ['x', 'y', 'radius', 'color', 'alpha'] },
  { name: 'particles', fields: ['type', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'radius',
    'color', 'life', 'maxLife'] },
  { name: 'lightningTethers', fields: ['x1', 'y1', 'x2', 'y2'] },
  { name: 'blackHoles', fields: ['x', 'y', 'radius', 'rotAngle'] },
  { name: 'mines', fields: ['x', 'y', 'radius'] },
  { name: 'laserBeams', fields: ['x', 'y', 'angle', 'width', 'length'] },
  { name: 'companionDrones', fields: ['x', 'y', 'angle'] },
  { name: 'orbiters', fields: ['angle', 'distance', 'radius', 'color'] },
  { name: 'dashTrails', fields: ['x1', 'y1', 'x2', 'y2', 'color', 'life', 'maxLife'] },
  { name: 'texts', fields: ['x', 'y', 'text', 'color', 'size', 'life', 'maxLife'] }
]);

/** The contract when it exists, otherwise the fixture's own copy of it. */
function arraySpec(box) {
  const schema = box.window.NeonLanSchema || (() => {
    try { return vm.runInContext('SnapshotSchema', box); } catch { return null; }
  })();
  return schema?.arrays || FALLBACK_ARRAYS;
}

const pilot = (id, shipId, over = {}) => ({
  id, shipId, x: 111, y: 222, hp: 77, maxHp: 99, aimAngle: 0.5, radius: 16,
  baseSpeed: 264, visualDash: 0.4, dashTimeLeft: 0.12, invulnTimer: 0.2,
  lastSlashFx: { x1: 1, y1: 2, x2: 3, y2: 4, life: 0.2, maxLife: 0.28, fire: true, cryo: false, precise: true },
  level: 7, xp: 40, xpNeeded: 90,
  weapons: { blaster: 3, orbit: 2 }, passives: { thruster: 2, armor: 1 },
  dashUpgrades: { dash_dmg: 2 }, limitBreaks: { dash_dmg: 1 },
  dashCharges: 2, maxDashCharges: 3, dashRechargeTimer: 0.4, dashRechargeTime: 1.9,
  dashSlashDmg: 210, dashSlashWidth: 22, dashCombo: 2,
  cdrMultiplier: 0.9, dmgMultiplier: 1.4, areaMultiplier: 1.1,
  regen: 2.6, crystals: 12, invulnTimer: 0.2, isDashing: false, dashTimeLeft: 0,
  dash: 0, invuln: 0.1, recharge: 0.4, charges: 2, lastSeq: 12,
  pendingUpgrades: 0, upgradeRound: 1, upgradeCapacity: 3, upgradeFinished: true,
  downed: false, reviveIn: 0,
  hasAegis: true, aegisDuration: 0.3, aegisRadius: 88, aegisTimer: 0.25,
  hasDashBlast: true, hasFireTrail: true, hasDashCryo: false,
  dashBlastRadius: 120, fireTrailDuration: 3, dashCryoDuration: 2.5,
  choices: ['power', 'haste'], pickedUpgradeIds: ['power'],
  legendaryPityId: null, cheatDeathUsed: false,
  profile: { name: '队友', color: '#ffbb55', colorId: 'auto' },
  ...over
});

/** Field names whose real values are booleans, not numbers. Getting this wrong
 *  makes the trimmer treat every enemy as a boss and refuse to drop any. */
const BOOLEAN_FIELDS = new Set(['isBoss', 'isElite', 'hasShield', 'arming',
  'isLevel5', 'docked', 'shiftActive', 'downed']);
const STRING_FIELDS = new Set(['type', 'color', 'text']);

const entity = (index, fields) => {
  const base = { id: 1000 + index };
  for (const field of fields) {
    if (BOOLEAN_FIELDS.has(field)) base[field] = false;
    else if (STRING_FIELDS.has(field)) base[field] = field === 'text' ? `命中 ${index}` : '#00f3ff';
    else base[field] = index % 2 ? 3.5 : 7;
  }
  if (fields.includes('type')) base.type = index % 3 === 0 ? 'swarmer' : 'spitter';
  return base;
};

/** Build the world. `count` scales every array past its cap. */
function world(count = 400) {
  const box = sandbox();
  const spec = arraySpec(box);
  const arrays = spec.map(entry => entry.name);
  const game = {
    state: 'playing', survivalTime: 321.5, kills: 88, difficulty: 3,
    endlessMode: true, width: 800, height: 600, ctx: {},
    player: pilot('host', 'riftblade', { x: 10, y: 20 }),
    enemies: [], bullets: [], enemyBullets: [], gems: [], shockwaves: [],
    particles: [], lightningTethers: [], blackHoles: [], mines: [],
    laserBeams: [], companionDrones: [], orbiters: [], dashTrails: [], texts: []
  };
  for (const entry of spec) {
    game[entry.name] = Array.from({ length: count }, (_, i) => entity(i, entry.fields));
  }
  game.enemies[0].isBoss = true;
  game.enemies[0].type = 'boss_carrier';
  game.enemies[1].isElite = true;
  game.enemies[1].isBoss = false;
  const ally = pilot('guest', 'phantom', { x: 30, y: 40,
    weapons: { phantom_scythe: 3, orbit: 2, drones: 2 } });
  ally.phantom = { docked: false, shiftActive: true, charges: 2, recharge: 0.3,
    dockCooldown: 1, shiftRemaining: 3, stealthEnergy: 2, stealthMax: 4.8,
    shiftLockUntil: 0, ectoplasm: 1, maxEctoplasm: 5,
    visual: [{ kind: 'wisp', x: 1, y: 2 }], shiftTrail: [], shiftFlash: 0, reapFlash: 0 };
  const coop = { roundId: 4, seq: 9, allies: new Map([['guest', ally]]),
    resonance: { link: { tier: 2, distance: 40, damageBonus: 0.1, shieldSource: true },
      pulseCooldown: 1, shieldTimer: 2, threatFactor: 1.1 } };
  game.lanCoop = coop;
  return { box, game, ally, coop, spec };
}

/** The frame the host actually puts on the wire for one guest. */
function frame(count = 400) {
  const { box, game, ally, coop } = world(count);
  const snapshots = box.window.NeonLanSnapshots;
  if (snapshots) {
    // players[] is produced by snapshots.js; give it a registry-shaped view.
    game.players = { list: () => [{ id: 'host', state: game.player },
      { id: 'guest', state: ally }] };
  }
  const bounded = box.window.NeonLanCoop.boundedSnapshot(game, ally, 7, coop.resonance, 'guest');
  return { box, game, ally, spec: arraySpec(box), frame: bounded };
}

/** Stable serialisation used by the byte-identity check. */
function serialize(count = 400) {
  return JSON.stringify(frame(count).frame);
}

module.exports = { ROOT, read, sandbox, pilot, world, frame, serialize };
