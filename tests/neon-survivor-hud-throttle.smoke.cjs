/* Run: node tests/neon-survivor-hud-throttle.smoke.cjs
 *
 * The HUD DOM pass (getElementById storm, innerHTML rebuilds, classList and
 * style writes, plus the combat dock) was the most expensive per-frame DOM
 * workload in the game and ran once per animation frame. simulation/index.js
 * now throttles it to ~15Hz. Dash/blink charges are gameplay state, so they
 * must keep being mirrored onto the player on EVERY simulated frame.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

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
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);

// Every phase update() drives. Stubbed so this test measures only the HUD
// throttle contract, not the simulation itself.
const PHASES = ['dispatchPilotTicks', 'updateSpawning', 'applyPassiveRegen', 'decayScreenShake',
  'tickPlayerInvulnerability', 'updateDashAndMovement', 'updateAntiAfk', 'updateAegis', 'updateAutoAim',
  'updateCamera', 'updateWeapons', 'updateLaserBeams', 'updateCompanionDrones', 'updateBlackHoles',
  'updateCryoMines', 'updateDashTrails', 'updateBullets', 'updateEnemyProjectiles', 'updateEnemies',
  'updateLightningTetherDamage', 'updateGems', 'updateShockwaves', 'updateParticles',
  'updateFloatingTexts', 'cleanAndCompactGems'];

function harness() {
  const game = Object.create(proto);
  game.state = 'playing';
  game.survivalTime = 0;
  game.endlessMode = false;
  game.hudAccum = 0;
  game.player = { shipId: 'riftblade', x: 0, y: 0, dashCharges: 3, maxDashCharges: 3, dashRechargeTimer: 0 };
  game.enemies = [];
  const counts = { hud: 0, sync: 0 };
  for (const phase of PHASES) game[phase] = () => {};
  game.updateHUD = () => { counts.hud++; };
  game.syncShipHudState = () => { counts.sync++; };
  return { game, counts };
}

// --- 60Hz: one simulated second must not produce 60 HUD passes ---
const at60 = harness();
for (let frame = 0; frame < 60; frame++) at60.game.update(1 / 60);
assert.equal(at60.counts.sync, 60, 'dash state must mirror on every simulated frame');
assert.ok(at60.counts.hud >= 13 && at60.counts.hud <= 16,
  `expected ~15 HUD passes per second at 60Hz, got ${at60.counts.hud}`);
assert.ok(at60.counts.hud < 60, 'the HUD must not run once per frame');

// --- 120Hz panels must not double the HUD cost ---
const at120 = harness();
for (let frame = 0; frame < 120; frame++) at120.game.update(1 / 120);
assert.equal(at120.counts.sync, 120, 'dash state must mirror on every simulated frame');
assert.ok(at120.counts.hud >= 13 && at120.counts.hud <= 16,
  `expected ~15 HUD passes per second at 120Hz, got ${at120.counts.hud}`);
assert.ok(at120.counts.hud < at60.counts.hud * 1.5,
  'a 120Hz panel must not double the HUD work');

// --- the accumulator fires once per window and then resets ---
const step = harness();
step.game.update(0.05);
assert.equal(step.counts.hud, 0, 'a sub-window frame must not refresh the HUD');
step.game.update(0.05);
assert.equal(step.counts.hud, 1, 'crossing the window refreshes exactly once');
step.game.update(0.05);
assert.equal(step.counts.hud, 1, 'the accumulator must reset after firing');

// --- syncShipHudState mirrors ship-owned charges onto the player ---
function bare() {
  const game = Object.create(proto);
  game.player = { shipId: 'riftblade', dashCharges: 0, maxDashCharges: 0, dashRechargeTimer: 0 };
  return game;
}
assert.equal(typeof proto.syncShipHudState, 'function', 'syncShipHudState must stay on the prototype');

sandbox.window.NeonAstra = {
  state: () => ({ warpUpgrades: { star_gate: 2 }, blinkCharges: 3, blinkRecharge: 0.4 })
};
const astra = bare();
astra.player.shipId = 'astra';
astra.syncShipHudState();
assert.equal(astra.player.dashCharges, 3, 'astra blink charges must reach the player');
assert.equal(astra.player.maxDashCharges, 4, 'star_gate raises the blink cap to 4');
assert.equal(astra.player.dashRechargeTimer, 0.4);

sandbox.window.NeonPhantom = {
  state: () => ({ warpUpgrades: { charge_overflow: 1 }, dashCharges: 2, dashRecharge: 1.1 })
};
const phantom = bare();
phantom.player.shipId = 'phantom';
phantom.syncShipHudState();
assert.equal(phantom.player.dashCharges, 2, 'phantom dash charges must reach the player');
assert.equal(phantom.player.maxDashCharges, 3, 'charge_overflow raises the dash cap to 3');
assert.equal(phantom.player.dashRechargeTimer, 1.1);

// A ship with no external charge pool must be left untouched.
const rift = bare();
rift.player.dashCharges = 2;
rift.syncShipHudState();
assert.equal(rift.player.dashCharges, 2, 'riftblade charges are owned by the player itself');

console.log('HUD throttle passed: ~15Hz DOM pass at 60/120Hz, per-frame dash mirroring, accumulator reset.');
