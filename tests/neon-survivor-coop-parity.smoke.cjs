/* Run: node tests/neon-survivor-coop-parity.smoke.cjs
 *
 * A guest must experience the same ship as the host. It did not:
 *
 *   - "how fast does a pilot move" was written three times -- the host's own
 *     player, the host's simulation of a remote ally (combat/pilots.js) and the
 *     guest's local prediction (network/prediction.js) -- and they disagreed.
 *     The ally's dash was a hardcoded 780 px/s against the host's
 *     baseSpeed * 3.6 (864 at level 1, up to 1386 at the speed cap), so a guest
 *     dashed 10% short at level 1 and 44% short fully upgraded. The thruster
 *     multiplier was 0.15 vs 0.12, limit-break speed was missing from two of
 *     them, and the ally's baseSpeed was never recalculated after a guest
 *     picked Thruster, so a guest never actually got faster.
 *   - the riftblade warp ribbon and the aegis aura were drawn for
 *     `this.player` only, so a guest's signature dash effect appeared on
 *     nobody's screen.
 *   - the guest's own dash stats were hardcoded in the view (95 slash damage,
 *     0 combo, no aegis/fire/cryo), so its dock and HUD disagreed with the
 *     host's about the ship it was flying.
 *
 * Everything now derives from core/simulation/speed.js (PilotSpeed). These
 * assertions pin the parity so it cannot silently regress again.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const ROOT = neonCore.ROOT;
const read = part => fs.readFileSync(path.join(ROOT, part), 'utf8');

const sandbox = {
  window: { addEventListener() {} },
  document: { getElementById() { return null; }, createElement: () => ({ style: {} }), addEventListener() {} },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 0 }, console,
  setTimeout, clearTimeout, setInterval, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['rarity', 'ships', 'ships.generated', 'players', 'combat/pilots']);
// network modules under test
for (const part of ['network/schema','network/ready', 'network/snapshots', 'network/prediction',
  'network/world-view', 'network/coop']) {
  vm.runInContext(read('js/' + part + '.js'), sandbox, { filename: part });
}
const PilotSpeed = vm.runInContext('PilotSpeed', sandbox);
const PilotSystem = sandbox.window.NeonPilotSystem;
const Prediction = sandbox.window.NeonLanPrediction;

const pilot = (shipId, extra = {}) => ({
  id: 'guest', shipId, x: 0, y: 0, hp: 100, maxHp: 100, level: 1,
  weapons: {}, passives: {}, dashUpgrades: {}, limitBreaks: {},
  dashCharges: 3, maxDashCharges: 3, dashRechargeTimer: 0, input: { dx: 0, dy: 0, aim: 0, dash: false },
  ...extra
});

// ---------------------------------------------------------------------------
// 1. One model: a remote ally and the host's own player move identically.
// ---------------------------------------------------------------------------
for (const shipId of ['riftblade', 'astra', 'phantom']) {
  for (const build of [
    {},
    { level: 12, passives: { thruster: 4 } },
    { level: 25, passives: { thruster: 5 }, limitBreaks: { thruster: 3 } }
  ]) {
    const host = pilot(shipId, build);
    const ally = pilot(shipId, build);
    assert.equal(PilotSpeed.base(host), PilotSpeed.base(ally),
      `${shipId}: host and ally base speed must match`);
    assert.equal(PilotSpeed.dash(host), PilotSpeed.dash(ally),
      `${shipId}: host and ally dash speed must match`);
    assert.equal(PilotSpeed.move(host), PilotSpeed.move(ally),
      `${shipId}: host and ally walk speed must match`);
  }
}

// The dash is the host's own formula, not a second constant.
{
  const rift = pilot('riftblade');
  assert.equal(PilotSpeed.base(rift), 240, 'riftblade starts at its ship speed');
  assert.equal(PilotSpeed.dash(rift), 240 * 3.6,
    'the dash must be baseSpeed * 3.6, the host\'s own formula');
  assert.ok(Math.abs(PilotSpeed.dashDistance(rift) - 155.52) < 0.01,
    'a level-1 riftblade dash covers ~155.5px, not the old hardcoded 140.4px');
  const maxed = pilot('riftblade', { level: 30, passives: { thruster: 5 }, limitBreaks: { thruster: 5 } });
  assert.equal(PilotSpeed.base(maxed), 385, 'the global speed cap still applies');
  assert.equal(PilotSpeed.dashDistance(maxed), 385 * 3.6 * 0.18,
    'an upgraded dash scales with the speed cap instead of staying at 140px');
  assert.ok(PilotSpeed.dashDistance(maxed) > PilotSpeed.dashDistance(rift) * 1.5,
    'upgrades must visibly lengthen the dash');
}

// A guest that picks Thruster actually gets faster, and its dash grows.
{
  const before = pilot('riftblade', { level: 6 });
  const after = pilot('riftblade', { level: 6, passives: { thruster: 3 } });
  assert.ok(PilotSpeed.base(after) > PilotSpeed.base(before),
    'Thruster must raise the ally base speed (it was frozen at the ship value)');
  assert.ok(PilotSpeed.dash(after) > PilotSpeed.dash(before), 'and therefore its dash');
}

// Class states apply to remote allies too, not only the host's own pilot.
{
  const astraWard = pilot('astra', { astra: { wardActive: true } });
  assert.equal(PilotSpeed.move(astraWard), PilotSpeed.base(astraWard) * 0.2,
    'an anchored astra turret is slow on the ally as well');
  const astraKite = pilot('astra', { astra: { kiteSpeedTimer: 1 } });
  assert.equal(PilotSpeed.move(astraKite), PilotSpeed.base(astraKite) * 1.5,
    'astra kite speed applies to the ally');
  const phantomSprint = pilot('phantom', { phantom: { sprintTimer: 1 } });
  assert.equal(PilotSpeed.move(phantomSprint), PilotSpeed.base(phantomSprint) * 1.75,
    'phantom sprint applies to the ally');
  const phantomShift = pilot('phantom', { phantom: { shiftActive: true } });
  assert.equal(PilotSpeed.move(phantomShift), PilotSpeed.base(phantomShift) * 1.40,
    'phantom stealth speed applies to the ally');
  assert.equal(PilotSpeed.move(pilot('riftblade', { downed: true })), 0, 'a wreck cannot steer');
  // A docked phantom rides its carrier: the ally step and the guest
  // prediction both refuse to steer it.
  const docked = pilot('phantom', { phantom: { docked: true } });
  const dockGame = { state: 'playing', player: { x: 0, y: 0, level: 1 }, enemies: [] };
  PilotSystem.stepRemote(dockGame, docked, { dx: 1, dy: 0, aim: 0 }, 1 / 60);
  assert.equal(docked.x, 0, 'a docked phantom must not be steered by the host either');
  const dockState = Prediction.create(0, 0);
  assert.equal(Prediction.moveSpeed(
    { shipId: 'phantom', downed: false, phantom: { docked: true } }, 0, dockState), 0,
    'and the guest must not predict movement for it');
}

// ---------------------------------------------------------------------------
// 2. The host simulates a remote ally's dash over exactly that distance.
// ---------------------------------------------------------------------------
{
  const ally = pilot('riftblade', { level: 10, passives: { thruster: 2 } });
  const game = { state: 'playing', player: { x: 0, y: 0, level: ally.level }, enemies: [] };
  const start = ally.x;
  PilotSystem.startDash(game, ally);
  assert.ok(ally.dashTimeLeft > 0, 'the ally dash must start');
  const dt = 1 / 120;
  let ticks = 0;
  while (ally.dashTimeLeft > 0 && ticks < 200) { PilotSystem.stepRemote(game, ally, { dx: 1, dy: 0, aim: 0 }, dt); ticks++; }
  const travelled = ally.x - start;
  const expected = PilotSpeed.dashDistance(ally);
  assert.ok(Math.abs(travelled - expected) < expected * 0.05,
    `the simulated ally dash must cover the shared dash distance (got ${travelled.toFixed(1)}, expected ~${expected.toFixed(1)})`);
}

// The host's own dash uses the same shared value.
{
  assert.match(read('js/core/simulation/player.js'), /const dashSpeed = PilotSpeed\.dash\(this\.player\)/,
    'the host dash must read the shared model, not a local constant');
  assert.match(read('js/core/simulation/player.js'), /const speed = PilotSpeed\.move\(this\.player\)/,
    'the host walk speed must read the shared model');
  assert.match(read('js/combat/pilots.js'), /PilotSpeed\.move\(pilot, pilot\.dashTimeLeft > 0\)/,
    'the ally step must read the shared model');
  assert.doesNotMatch(read('js/combat/pilots.js'), /\?\s*780\s*:/,
    'the hardcoded 780 ally dash speed must be gone');
  assert.doesNotMatch(read('js/network/prediction.js'), /return 780/,
    'the hardcoded 780 predicted dash speed must be gone');
}

// ---------------------------------------------------------------------------
// 3. The guest predicts with the host's numbers.
// ---------------------------------------------------------------------------
{
  // The snapshot's authoritative baseSpeed wins over any local formula.
  const guest = { shipId: 'riftblade', x: 0, y: 0, hp: 100, downed: false, baseSpeed: 385 };
  const state = Prediction.create(0, 0);
  state.dashUntil = 1000;
  assert.equal(Prediction.moveSpeed(guest, 0, state), 385 * 3.6,
    'the guest must dash at the host\'s baseSpeed * 3.6');
  state.dashUntil = 0;
  assert.equal(Prediction.moveSpeed(guest, 100, state), 385,
    'and walk at the host\'s baseSpeed');
}

// The predicted dash covers the same ground as the host's.
{
  const guest = { shipId: 'riftblade', x: 0, y: 0, hp: 100, downed: false, baseSpeed: 240 };
  const state = Prediction.create(0, 0);
  const now = 5000;
  assert.equal(Prediction.dash(state, guest, now), true);
  const dt = 1 / 120;
  let elapsed = 0;
  let t = now;
  while (t < now + PilotSpeed.DASH_DURATION * 1000 && elapsed < 1) {
    Prediction.advance(state, guest, { dx: 1, dy: 0 }, dt, t);
    t += dt * 1000; elapsed += dt;
  }
  const expected = PilotSpeed.dashDistance(guest);
  assert.ok(Math.abs(state.x - expected) < expected * 0.06,
    `the predicted dash must match the host's distance (got ${state.x.toFixed(1)}, expected ~${expected.toFixed(1)})`);
}

// ---------------------------------------------------------------------------
// 4. The riftblade warp ribbon exists for every pilot.
// ---------------------------------------------------------------------------
{
  const ally = pilot('riftblade', { dashUpgrades: { dash_fire: 1 } });
  const game = { state: 'playing', player: { x: 0, y: 0, level: 1 }, enemies: [] };
  PilotSystem.startDash(game, ally);
  PilotSystem.stepRemote(game, ally, { dx: 1, dy: 0, aim: 0 }, 1 / 60);
  assert.ok(ally.lastSlashFx, 'the host must build a ribbon for the ally it simulates');
  assert.equal(ally.lastSlashFx.x1, 0, 'the ribbon starts at the dash origin');
  assert.ok(ally.lastSlashFx.x2 > 0, 'and grows with the dash');
  assert.equal(ally.lastSlashFx.fire, true, 'the ribbon carries the ally fire-trail tint');
  const life = ally.lastSlashFx.life;
  for (let i = 0; i < 30; i++) PilotSystem.stepRemote(game, ally, { dx: 1, dy: 0, aim: 0 }, 1 / 60);
  assert.ok(ally.lastSlashFx.life < life, 'and fades after the dash ends');

  // The renderer must collect ribbons from allies, not just the local player.
  const effects = read('js/core/render/effects.js');
  assert.match(effects, /pilotSlashRibbons\(\)/);
  assert.match(effects, /this\.lanCoop\?\.allies\?\.values\?\.\(\)/,
    'renderSlashFx must iterate remote allies');
  assert.match(effects, /renderAegisAura\(ctx, visible\)[\s\S]*?this\.lanCoop\?\.allies\?\.values\?\.\(\)/,
    'renderAegisAura must iterate remote allies');
}

// The guest draws its own ribbon locally, without waiting for a round trip.
{
  const guest = { shipId: 'riftblade', x: 10, y: 20, hp: 100, downed: false, baseSpeed: 240 };
  const state = Prediction.create(10, 20);
  Prediction.dash(state, guest, 1000);
  assert.ok(state.slashFx, 'the guest must predict its own ribbon');
  assert.equal(state.slashFx.x1, 10, 'starting at the guest position');
  Prediction.advance(state, guest, { dx: 1, dy: 0 }, 1 / 60, 1010);
  assert.ok(state.slashFx.x2 > 10, 'and growing as it moves');
  const coop = read('js/network/coop.js');
  assert.match(coop, /view\.player\.lastSlashFx = this\.predicted\?\.slashFx/,
    'the guest view must receive the predicted ribbon');
}

// ---------------------------------------------------------------------------
// 5. The snapshot carries the guest's own dash stats and speed.
// ---------------------------------------------------------------------------
{
  const { snapshot } = sandbox.window.NeonLanCoop;
  const game = {
    state: 'playing', survivalTime: 5, kills: 0, difficulty: 0, endlessMode: false,
    player: { x: 0, y: 0, hp: 100, maxHp: 100, level: 4, weapons: {}, passives: {}, limitBreaks: {} },
    enemies: [], bullets: [], enemyBullets: [], gems: [], shockwaves: [], particles: [],
    lightningTethers: [], blackHoles: [], mines: [], laserBeams: [], companionDrones: [],
    orbiters: [], dashTrails: [], texts: []
  };
  const ally = pilot('riftblade', {
    level: 4, baseSpeed: 264, dashSlashDmg: 214, dashCombo: 3, dashRechargeTime: 1.4,
    hasAegis: true, aegisDuration: 0.3, aegisRadius: 80, aegisTimer: 0.2,
    hasFireTrail: true, hasDashCryo: false, limitBreaks: { dash_dmg: 2 }
  });
  const frame = snapshot(game, ally, 1);
  for (const field of ['baseSpeed', 'dashSlashDmg', 'dashCombo', 'dashRechargeTime',
    'hasAegis', 'aegisDuration', 'aegisRadius', 'aegisTimer', 'hasFireTrail', 'hasDashCryo']) {
    assert.ok(field in frame.guest, `the snapshot must carry guest.${field}`);
  }
  assert.equal(frame.guest.baseSpeed, 264, 'the guest must learn its authoritative speed');
  assert.equal(frame.guest.dashSlashDmg, 214, 'and its real slash damage');
  assert.equal(frame.guest.dashCombo, 3);
  assert.equal(frame.guest.hasAegis, true);
  assert.deepEqual(Array.from(Object.keys(frame.guest.limitBreaks)), ['dash_dmg'],
    'the guest must learn its own limit breaks');
}

// ---------------------------------------------------------------------------
// 6. The guest view mirrors those fields instead of hardcoding them.
// ---------------------------------------------------------------------------
{
  const { updateView } = sandbox.window.NeonLanWorldView;
  const game = { width: 800, height: 600, ctx: {} };
  const state = {
    host: { x: 0, y: 0, hp: 100, maxHp: 100, weapons: {}, passives: {} },
    guest: {
      x: 1, y: 2, hp: 90, maxHp: 100, shipId: 'riftblade', weapons: {}, passives: {},
      baseSpeed: 300, dashSlashDmg: 250, dashCombo: 4, dashRechargeTime: 1.4,
      hasAegis: true, aegisDuration: 0.3, aegisRadius: 90, aegisTimer: 0.25,
      hasDashBlast: true, hasFireTrail: true, hasDashCryo: true,
      limitBreaks: { dash_dmg: 1 }
    },
    enemies: [], bullets: [], enemyBullets: [], gems: [], particles: [], texts: [],
    shockwaves: [], laserBeams: [], companionDrones: [], blackHoles: [], mines: [],
    lightningTethers: [], orbiters: [], dashTrails: [], time: 5, kills: 0, difficulty: 0
  };
  const view = updateView(Object.create({}), state, game, null);
  assert.equal(view.player.baseSpeed, 300, 'the view must use the authoritative speed');
  assert.equal(view.player.dashSlashDmg, 250, 'not the old hardcoded 95');
  assert.equal(view.player.dashCombo, 4, 'not the old hardcoded 0');
  assert.equal(view.player.dashRechargeTime, 1.4, 'not the old hardcoded 2.2s cooldown');
  assert.equal(view.player.hasAegis, true, 'aegis must be visible to the guest');
  assert.equal(view.player.aegisTimer, 0.25, 'so its aura can be drawn');
  assert.equal(view.player.aegisRadius, 90);
  assert.equal(view.player.hasDashBlast, true);
  assert.equal(view.player.hasFireTrail, true);
  assert.equal(view.player.hasDashCryo, true);
  assert.deepEqual(Array.from(Object.keys(view.player.limitBreaks)), ['dash_dmg']);
}

// ---------------------------------------------------------------------------
// 7. A guest's derived stats are computed, not left at the defaults.
// ---------------------------------------------------------------------------
{
  const recalc = read('js/core/progression/recalculate.js');
  assert.match(recalc, /recalculateDashStats\(pilot = this\.player\)/,
    'the derived dash stats must be reusable for an ally');
  const coop = read('js/network/coop.js');
  assert.match(coop, /this\.game\.recalculateDashStats\?\.\(ally\)/,
    'a guest upgrade must recompute the ally derived stats');
  assert.match(coop, /PilotSpeed\.recalculate\(ally\)/,
    'and the ally cached speed');
}

// ---------------------------------------------------------------------------
// 8. Cosmetic fidelity: a dense frame spreads the loss instead of losing one layer.
// ---------------------------------------------------------------------------
{
  const coop = read('js/network/coop.js');
  assert.match(coop, /const SNAPSHOT_LIMIT = 18000/, 'the frame budget must be explicit');
  const { TRIM_ORDER, ENTITY_ARRAYS } = sandbox.window.NeonLanSchema;
  assert.ok(TRIM_ORDER.length > 5, 'trimming must be table-driven');
  const floors = Object.fromEntries(TRIM_ORDER.map(spec => [spec.name, spec.floor]));
  for (const field of ['particles', 'shockwaves', 'dashTrails', 'texts']) {
    assert.ok(floors[field] > 0, `${field} must keep a floor so it is not zeroed first`);
  }
  // The cosmetic caps must cover what the host itself can produce.
  const capOf = name => ENTITY_ARRAYS.find(spec => spec.name === name).cap;
  assert.equal(capOf('particles'), 60,
    'the host caps its own particles at 60, so the guest must receive up to 60');
  assert.equal(capOf('shockwaves'), 40);
  assert.equal(capOf('texts'), 40);
  assert.ok(ENTITY_ARRAYS.every(spec => spec.cap <= spec.safeCap),
    'no declared cap may exceed the cap its own validator enforces');
}

console.log('Co-op parity passed: one movement/dash model for host, ally and '
  + 'prediction, ribbon and aegis for every pilot, guest dash stats from the '
  + 'host, cosmetic caps and trim floors.');
