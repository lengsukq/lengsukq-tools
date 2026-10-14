/* A deliberately rich co-op world for snapshot contract tests.
 *
 * Every replicated field is populated with a distinctive value so a missing or
 * renamed field is visible, every entity array is filled past its declared cap
 * so the producer's limits and the validator's limits are exercised together,
 * and the numbers span the range the real producers use (the arena culls normal
 * enemies beyond ~1650 units, so coordinates are a few thousand at most).
 *
 * The field lists and value kinds come from NeonLanSchema itself. The fixture
 * used to keep its own copy, which read the wrong property and therefore always
 * fell back to that copy -- a second declaration of the contract, in the test
 * that exists to prove there is only one.
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

/** The contract, which is the only place the field lists are declared. */
function schemaOf(box) {
  const schema = box.window.NeonLanSchema;
  if (!schema) throw new Error('NeonLanSchema must load before the fixture is built');
  return schema;
}

/** The entity layers, read out of the contract. */
function arraySpec(box) {
  return schemaOf(box).ENTITY_ARRAYS;
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
  regen: 2.6, crystals: 12, isDashing: false,
  lastSeq: 12, pendingUpgrades: 0, upgradeRound: 1, upgradeCapacity: 3, upgradeFinished: true,
  downed: false, reviveIn: 0,
  hasAegis: true, aegisDuration: 0.3, aegisRadius: 88, aegisTimer: 0.25,
  hasDashBlast: true, hasFireTrail: true, hasDashCryo: false,
  dashBlastRadius: 120, fireTrailDuration: 3, dashCryoDuration: 2.5,
  choices: ['power', 'haste'], pickedUpgradeIds: ['power'],
  legendaryPityId: null, cheatDeathUsed: false,
  profile: { name: '队友', color: '#ffbb55', colorId: 'auto' },
  ...over
});

const COLOR_WORDS = ['#ff3300', '#00f3ff', '#ffea00', '#9d00ff'];
const TYPE_WORDS = ['spitter', 'swarmer', 'sniper', 'boss_carrier'];
const TEXT_WORDS = ['命中 42', '+1', '暴击!', '⚠️ 虫潮蜂拥突袭 (SWARM RUSH)!'];

/** A value of the field's declared kind. `kind` comes from the contract. */
function valueOf(kind, field, index) {
  if (kind === 'string') {
    if (field === 'text') return TEXT_WORDS[index % TEXT_WORDS.length];
    if (field === 'color') return COLOR_WORDS[index % COLOR_WORDS.length];
    return TYPE_WORDS[index % TYPE_WORDS.length];
  }
  if (kind === 'boolean') return index % 4 === 0;
  if (/^(x|y|x1|y1|x2|y2)$/.test(field)) return ((index * 137) % 6000) - 3000 + 0.5;
  if (/^(vx|vy)$/.test(field)) return ((index % 17) - 8) * 12.5;
  return (index % 97) / 4 + 1;
}

function entity(index, spec, kinds) {
  const row = { id: 1000 + index };
  for (const field of spec.fields) {
    row[field] = valueOf(kinds[field] || 'number', field, index);
  }
  return row;
}

/** Build the world. `count` scales every array past its cap. */
function world(count = 400) {
  const box = sandbox();
  const schema = schemaOf(box);
  const spec = schema.ENTITY_ARRAYS;
  const kinds = schema.ENTITY_KINDS;
  const game = {
    state: 'playing', survivalTime: 321.5, kills: 88, difficulty: 3,
    endlessMode: true, width: 800, height: 600, ctx: {},
    player: pilot('host', 'riftblade', { x: 10, y: 20 }),
    enemies: [], bullets: [], enemyBullets: [], gems: [], shockwaves: [],
    particles: [], lightningTethers: [], blackHoles: [], mines: [],
    laserBeams: [], companionDrones: [], orbiters: [], dashTrails: [], texts: []
  };
  for (const entry of spec) {
    game[entry.name] = Array.from({ length: count }, (_, i) => entity(i, entry, kinds));
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
  return { box, game, ally, coop, spec, schema };
}

/** The wire frame the host actually puts on a guest's channel. */
function frame(count = 400) {
  const world0 = world(count);
  const { box, game, ally, coop } = world0;
  if (box.window.NeonLanSnapshots) {
    // players[] is produced by snapshots.js; give it a registry-shaped view.
    game.players = { list: () => [{ id: 'host', state: game.player },
      { id: 'guest', state: ally }] };
  }
  const wire = box.window.NeonLanCoop.boundedSnapshot(game, ally, 7, coop.resonance, 'guest');
  return { ...world0, wire, frame: wire };
}

/** What a guest reads after decoding the frame it received. */
function delivered(count = 400) {
  const built = frame(count);
  return built.schema.decodeFrame(built.wire);
}

module.exports = { ROOT, read, sandbox, schemaOf, pilot, world, frame, delivered };
