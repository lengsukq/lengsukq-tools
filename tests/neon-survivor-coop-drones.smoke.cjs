/* Run: node tests/neon-survivor-coop-drones.smoke.cjs
 *
 * A remote pilot has no client running the world: the host runs all 27 phases
 * for the guest. Anything that is simulated "per pilot" therefore has to be
 * driven from the host, and the drone and orbiter weapons were not -- they were
 * written against `this.player` and `this.orbiters` only.
 *
 * Two consequences, both invisible until you look for them:
 *   - the guest's own drone and orbiter weapons produced no bullets and no
 *     damage, on anyone's screen;
 *   - the host synthesised a copy of the guest's drones into
 *     `frame.guest.companionDrones`, which NO code reads, so the guest saw
 *     neither its own nor a correct copy of the host's.
 *
 * Ownership now sits on the pilot (`pilot.companionDrones` / `pilot.orbiters`),
 * the host simulates every pilot's, and `game.companionDrones` / `game.orbiters`
 * are the aggregate the renderer and the wire both read.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const sandbox = {
  window: { addEventListener() {} },
  document: { getElementById: () => null, addEventListener() {} },
  navigator: { getGamepads: () => [] },
  localStorage: { getItem: () => null, setItem() {} },
  console, performance: { now: () => 1000 },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['players', 'network/schema', 'network/snapshots', 'network/coop']);

const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const { PlayerRegistry, createRemotePilot } = sandbox.window.NeonPlayers;

function world() {
  const game = Object.assign(Object.create(proto), {
    state: 'playing', survivalTime: 10, width: 800, height: 600, ctx: {},
    bullets: [], enemies: [], enemyBullets: [], gems: [], particles: [], texts: [],
    shockwaves: [], laserBeams: [], blackHoles: [], mines: [], lightningTethers: [],
    dashTrails: [], orbiters: [], companionDrones: [], weaponTimers: {},
    sound: { playLaser() {}, playZap() {}, playBossAlert() {} },
    player: {
      x: 0, y: 0, hp: 100, maxHp: 100, level: 1, radius: 16, shipId: 'riftblade',
      weapons: { orbit: 3 }, passives: {}, dashUpgrades: {}, limitBreaks: {},
      dmgMultiplier: 1, areaMultiplier: 1, extraProjectiles: 0, downed: false,
      orbiters: [], companionDrones: []
    }
  });
  game.players = new PlayerRegistry();
  game.players.register('host', game.player);
  const ally = createRemotePilot(game, 'guest', 'riftblade');
  ally.x = 400; ally.y = 0;
  ally.weapons = { orbit: 3, drones: 2 };
  ally.dmgMultiplier = 1; ally.areaMultiplier = 1;
  game.players.register('guest', ally);
  game.lanCoop = { roundId: 1, allies: new Map([['guest', ally]]), seq: 0 };
  game.dealDamage = (enemy, damage, source) => {
    game.damageLog.push({ enemy, damage, source });
    enemy.hp -= damage;
  };
  game.damageLog = [];
  return { game, ally };
}

// ---------------------------------------------------------------------------
// 1. Every pilot is simulated, not just the local one.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  assert.deepEqual(Array.from(game.combatPilots()), [game.player, ally],
    'the host simulates itself and every registered ally');

  game.updateOrbiters(1 / 60);
  game.updateCompanionDrones(1 / 60);

  assert.ok(ally.orbiters.length > 0, 'the ally gets its own orbiters');
  assert.ok(ally.companionDrones.length > 0, 'and its own companion drones');
  assert.ok(game.player.orbiters.length > 0, 'and the host keeps its own');
  // The aggregate is exactly both lists, so the renderer and the wire see every
  // pilot's weapons without knowing whose they are.
  assert.equal(game.orbiters.length, game.player.orbiters.length + ally.orbiters.length,
    'the aggregate is every pilot\'s orbiters');
  assert.equal(game.companionDrones.length,
    game.player.companionDrones.length + ally.companionDrones.length,
    'and every pilot\'s drones');
  // Every orbiter orbits its OWNER.
  const around = pilot => game.orbiters.filter(orb => orb.centerX === pilot.x &&
    orb.centerY === pilot.y).length;
  assert.equal(around(ally), ally.orbiters.length, 'an ally\'s orbiter orbits the ally');
  assert.equal(around(game.player), game.player.orbiters.length,
    'and the host\'s orbit the host');
}

// ---------------------------------------------------------------------------
// 2. The ally's orbiters actually cut, and its drones actually shoot.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  // On the orbit ring: distance = (85 + 20) * areaMultiplier, radius 9, so the
  // cutting circle reaches 21 units around a ring 105 units out.
  const enemy = { x: ally.x + 105, y: ally.y, hp: 100000, radius: 12, color: '#fff' };
  game.enemies = [enemy];
  // One tick with a large dt would be clamped by update(); call the phases the
  // way update() does, repeatedly, so the orbit sweep lands on the enemy.
  for (let i = 0; i < 120; i++) {
    game.updateOrbiters(1 / 60);
    game.updateCompanionDrones(1 / 60);
  }
  assert.ok(game.damageLog.some(hit => hit.source === 'orbit' && hit.enemy === enemy),
    'an ally\'s orbiter must deal its cutting damage');
  assert.ok(game.bullets.length > 0,
    'an ally\'s drone must fire into the host\'s authoritative bullet list');
  assert.ok(game.bullets.every(b => b.damage > 0 && Number.isFinite(b.vx)));
}

// ---------------------------------------------------------------------------
// 3. A drone aims from the drone, not from the host's own ship.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  ally.x = 4000; ally.y = 4000;
  game.player.x = 0; game.player.y = 0;
  // One enemy, near the ALLY and far from the host's ship.
  game.enemies = [{ x: 4100, y: 4000, hp: 500, radius: 12, color: '#fff' }];
  for (let i = 0; i < 60; i++) game.updateCompanionDrones(1 / 60);
  assert.ok(game.bullets.length > 0,
    'a drone must engage what is near its owner, not what is near the host');
}

// ---------------------------------------------------------------------------
// 4. The wire carries the ally's weapons, and nothing carries a dead copy.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  game.updateOrbiters(1 / 60);
  game.updateCompanionDrones(1 / 60);
  game.players.list = () => [{ id: 'host', state: game.player },
    { id: 'guest', state: ally }];
  const schema = sandbox.window.NeonLanSchema;
  const wire = sandbox.window.NeonLanCoop.boundedSnapshot(game, ally, 1, null, 'guest');
  const delivered = schema.decodeFrame(wire);

  assert.equal(delivered.orbiters.length, game.orbiters.length,
    'the guest receives every pilot\'s orbiters');
  assert.equal(delivered.companionDrones.length, game.companionDrones.length,
    'and every pilot\'s drones');
  assert.ok(delivered.orbiters.some(orb => orb.centerX === ally.x && orb.centerY === ally.y),
    'with the ally\'s orbit centre replicated, so they are drawn around the ally');
  assert.ok(delivered.companionDrones.every(dr => Number.isFinite(dr.x) && Number.isFinite(dr.y)),
    'and a position the renderer can use');
  // The dead second copy that no code ever read.
  assert.ok(!('companionDrones' in wire.guest) && !('orbiters' in wire.guest),
    'the guest pilot block must not carry an unread copy of an entity layer');
  const coopSource = fs.readFileSync(
    neonCore.ROOT + '/js/network/coop.js', 'utf8');
  assert.doesNotMatch(coopSource, /guest:\s*\{[\s\S]{0,400}?companionDrones:/,
    'and the transport must not synthesise one either');
}

// ---------------------------------------------------------------------------
// 5. A guest upgrade that grants the weapon reaches the same code path.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  ally.weapons = {};
  const coop = new sandbox.window.NeonLanCoop.Coop(game,
    { role: 'host', connected: true, send: () => true });
  coop.allies.set('guest', ally);
  coop.applyGuestUpgrade({ id: 'orbit', type: 'weapon', maxLvl: 5 }, ally);
  assert.equal(ally.weapons.orbit, 1, 'the upgrade lands on the ally');
  game.updateOrbiters(1 / 60);
  assert.ok(ally.orbiters.length > 0,
    'and the host builds the ally\'s orbiters without the ally ever running a frame');
}

// ---------------------------------------------------------------------------
// 6. Each drone fires exactly once per interval, in a real host frame.
//
//    js/core/game.js runs game.update(dt) and then lanCoop.updateHost(dt). The
//    transport used to simulate the guest's drones itself, which was the only
//    simulation there was -- but once the per-pilot phase existed too, a guest's
//    drones fired twice per frame. One drone per interval is the invariant.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  game.player.weapons = {};
  ally.weapons = { drones: 3 };
  game.enemies = [{ x: 400, y: 200, hp: 1e6, radius: 12, dead: false }];
  const coop = new sandbox.window.NeonLanCoop.Coop(game,
    { role: 'host', connected: true, capacity: 2, send: () => true });
  coop.allies.set('guest', ally);
  coop.resonances.set('guest', { link: null, pulseCooldown: 0, lastDash: {} });
  coop.ally = ally;
  coop.resonance = { link: null, pulseCooldown: 0, lastDash: {} };

  const SECONDS = 5;
  const TICKS = SECONDS * 60;
  for (let i = 0; i < TICKS; i++) {
    game.updateCompanionDrones(1 / 60);   // the world's phase
    coop.updateHost(1 / 60);              // the transport's tick
  }
  const drones = ally.companionDrones.length;
  assert.ok(drones > 1, 'the test needs more than one drone to be meaningful');
  const interval = ally.companionDrones[0].shootInterval;
  const expected = drones * SECONDS / interval;
  assert.ok(Math.abs(game.bullets.length - expected) <= drones + 2,
    `each of ${drones} drones must fire once per ${interval.toFixed(2)}s: expected `
    + `about ${expected.toFixed(0)} bullets in ${SECONDS}s, got ${game.bullets.length}`);
  assert.ok(game.bullets.length < expected * 1.5,
    'a drone must not be simulated twice');
}

// ---------------------------------------------------------------------------
// 7. A drone's bullet is attributed to the pilot that owns the drone, because
//    the owner decides whose level, crit rate and link bonus apply.
// ---------------------------------------------------------------------------
{
  const { game, ally } = world();
  game.player.weapons = {};
  ally.weapons = { drones: 2 };
  game.enemies = [{ x: 400, y: 200, hp: 1e6, radius: 12, dead: false }];
  for (let i = 0; i < 60; i++) game.updateCompanionDrones(1 / 60);
  assert.ok(game.bullets.length > 0, 'the drones fired');
  for (const bullet of game.bullets) {
    assert.equal(bullet.ownerId, 'guest',
      'an ally\'s drone bullet must carry its owner, or the hit is credited to the host');
    assert.equal(bullet.owner, 'guest');
  }
}

console.log('Co-op drones passed: the host simulates every pilot\'s drones and '
  + 'orbiters, they damage and fire from their owner, the wire carries them with a '
  + 'replicated orbit centre, and no unread copy of a layer is sent.');
