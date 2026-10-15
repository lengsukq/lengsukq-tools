/* Run: node tests/neon-survivor-coop-boss.smoke.cjs
 *
 * The co-op bosses are the only encounters a solo pilot cannot pass, and they
 * are the only bosses whose state has to survive a round trip through a wire
 * that carries exactly 16 enemy fields and no more. So this file pins three
 * separate things:
 *
 *   1. The mechanics. Every boss must be genuinely co-operative -- a lone pilot
 *      must not be able to satisfy it, or it is not a co-op encounter.
 *   2. The registry wiring. The rotation, the interface, and the dispatch that
 *      replaced the hardcoded `type === 'boss_dual_reactor'` checks in the
 *      simulation, the damage path, the reward path and both render paths.
 *   3. Fail-open. A guest that disconnects must never leave behind a boss that
 *      cannot be killed, because that ends the run with no way out.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const sandbox = {
  window: { addEventListener() {} }, console,
  document: { getElementById() { return null; } },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 1000 },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['network/coop-bosses', 'network/encounters']);
const bosses = sandbox.window.NeonLanCoopBosses;
const encounters = sandbox.window.NeonLanEncounters;
assert.ok(bosses, 'NeonLanCoopBosses must load');
assert.ok(encounters, 'NeonLanEncounters must load');

/** A hosting room. `pilots[0]` is the host seat; the rest are guest seats. */
function room(pilots) {
  const allies = new Map();
  for (const pilot of pilots.slice(1)) {
    allies.set(pilot.id, {
      id: pilot.id, x: pilot.x, y: pilot.y, hp: 100, maxHp: 100,
      downed: false, disconnected: false
    });
  }
  return {
    player: { id: 'host', x: pilots[0].x, y: pilots[0].y, hp: 100, maxHp: 100,
      crystals: 0, level: 1, weapons: {}, passives: {}, dmgMultiplier: 1 },
    enemies: [], texts: [], shockwaves: [], enemyBullets: [],
    survivalTime: 200, bossCycle: 2, difficulty: 0,
    lanCoop: { allies, ally: allies.get('guest') || null,
      rtc: { connected: true, role: 'host' } }
  };
}
function place(game, id, x, y) {
  if (id === 'host') { game.player.x = x; game.player.y = y; return; }
  const pilot = game.lanCoop.allies.get(id);
  pilot.x = x; pilot.y = y;
}
/** Records the two calls every co-op overlay is guaranteed to make. */
function stubCtx() {
  const calls = { fillText: 0, arc: 0 };
  return {
    calls,
    ctx: new Proxy({}, {
      get(target, key) {
        if (key in calls) return () => { calls[key]++; };
        return key in target ? target[key] : () => {};
      },
      set(target, key, value) { target[key] = value; return true; }
    })
  };
}

// ---------------------------------------------------------------------------
// 1. Registry: the whitelist, the interface and the rotation.
// ---------------------------------------------------------------------------
{
  assert.equal(bosses.isCoopBoss('boss_dual_reactor'), true);
  assert.equal(bosses.isCoopBoss('boss_mirror_bastion'), true);
  assert.equal(bosses.isCoopBoss('boss_polarity_split'), true);
  assert.equal(bosses.isCoopBoss('boss_nexus'), false, 'a solo boss is not a co-op boss');
  assert.equal(bosses.isCoopBoss('boss_carrier'), false);
  assert.equal(bosses.isCoopBoss('boss_devourer'), false);
  assert.equal(bosses.isCoopBoss(undefined), false);
  assert.equal(bosses.isCoopBoss(''), false);
  assert.equal(encounters.isCoopBoss('boss_mirror_bastion'), true);
  assert.equal(encounters.isCoopBoss('boss_nexus'), false);

  for (const entry of bosses.ROTATION) {
    for (const method of ['create', 'update', 'damageMultiplier', 'onVictory', 'render']) {
      assert.equal(typeof entry[method], 'function',
        `${entry.type} must implement ${method}()`);
    }
    assert.equal(typeof entry.label, 'string');
  }

  // Every second boss is a co-op encounter, and they cycle through the registry.
  assert.deepEqual([2, 4, 6, 8, 10].map(cycle => bosses.forCycle(cycle).type), [
    'boss_dual_reactor', 'boss_mirror_bastion', 'boss_polarity_split',
    'boss_dual_reactor', 'boss_mirror_bastion'
  ], 'the co-op bosses must rotate, not repeat');

  // A freshly created boss must still be scaled exactly once by scaleNewEnemies.
  for (const entry of bosses.ROTATION) {
    const game = room([{ x: 0, y: 0 }, { id: 'guest', x: 200, y: 0 }]);
    const boss = entry.create(game, 0, 0, 1, 1);
    assert.equal(boss.type, entry.type);
    assert.equal(boss.isBoss, true);
    assert.equal(boss.coopScaled, false,
      `${entry.type} must let scaleNewEnemies apply the co-op HP multiplier`);

    // And it must actually RECEIVE that multiplier: boss HP x party, once.
    // One guest is a two-pilot room, and the HP curve starts at x1.00 there
    // (see scaleByParty: it steps up from the SECOND guest).
    const base = boss.hp;
    const expected = Math.round(base * 1.65 * 1.0);
    game.enemies = [boss];
    encounters.scaleNewEnemies(game);
    assert.equal(boss.hp, expected,
      `${entry.type} must take the boss HP curve for a two-pilot room`);
    encounters.scaleNewEnemies(game);
    assert.equal(boss.hp, expected, `${entry.type} must not be scaled twice`);
  }
}

// ---------------------------------------------------------------------------
// 2. 双生裁决者: the number of capture points follows the party, and every
//    point needs its OWN pilot. Two pilots keep the original geometry.
// ---------------------------------------------------------------------------
{
  const two = room([{ x: -185, y: -20 }, { id: 'guest', x: 185, y: 20 }]);
  const dual = encounters.createDualBoss(two, 0, 0, 1, 1);
  assert.equal(dual.type, 'boss_dual_reactor');
  assert.equal(encounters.captureStatus(two, dual).both, true,
    'the original two-pilot geometry must still sync');

  const three = room([{ x: 0, y: 0 }, { id: 'guest', x: 0, y: 0 }, { id: 'guest-2', x: 0, y: 0 }]);
  const tri = encounters.createDualBoss(three, 0, 0, 1, 1);
  const points = encounters.capturePoints(tri, 3);
  assert.equal(points.length, 3, 'three pilots get three capture points');
  assert.equal(encounters.capturePoints(tri, 4).length, 4, 'four pilots get four');
  assert.equal(encounters.capturePoints(tri, 1).length, 2, 'never fewer than two');

  // One pilot per point: synced.
  place(three, 'host', points[0].x, points[0].y);
  place(three, 'guest', points[1].x, points[1].y);
  place(three, 'guest-2', points[2].x, points[2].y);
  assert.equal(encounters.captureStatus(three, tri).synced, true,
    'three pilots on three points must sync');

  // Two pilots on the SAME point: not synced, because a point needs its own pilot.
  place(three, 'guest-2', points[0].x, points[0].y);
  const stacked = encounters.captureStatus(three, tri);
  assert.equal(stacked.synced, false, 'a point must not be satisfied by a pilot already holding another');
  assert.ok(stacked.count < 3);
}

// ---------------------------------------------------------------------------
// 3. 镜像壁垒: the "attack from the left and the right together" rule.
//    Facing +x puts left/right on the sign of the pilot's y offset.
// ---------------------------------------------------------------------------
{
  const entry = bosses.REGISTRY['boss_mirror_bastion'];
  const game = room([{ x: 150, y: 220 }, { id: 'guest', x: 150, y: -220 }]);
  const boss = bosses.createOf('boss_mirror_bastion', game, 0, 0, 1, 1);
  boss.vx = 1; boss.vy = 0;   // pin the facing so the geometry is deterministic

  const split = entry.flankSplit(game, boss);
  assert.equal(split.left.length, 1, 'one pilot holds the left flank');
  assert.equal(split.right.length, 1, 'and one holds the right');
  assert.equal(split.held, true);
  assert.equal(entry.damageMultiplier(game, boss), 0.15,
    'the shield holds until BOTH flanks are engaged');

  // Both pilots on one side: the shield must not care that two are attacking.
  place(game, 'guest', 150, 220);
  assert.equal(entry.flankSplit(game, boss).held, false, 'a single flank is not a pincer');
  entry.update(game, boss, 3);
  assert.equal(boss.coopExposed, 0, 'one flank must never expose the core');
  assert.equal(entry.damageMultiplier(game, boss), 0.15);

  // A pilot outside the flank range does not count, however well placed.
  const far = room([{ x: 150, y: 900 }, { id: 'guest', x: 150, y: -900 }]);
  const farBoss = bosses.createOf('boss_mirror_bastion', far, 0, 0, 1, 1);
  farBoss.vx = 1; farBoss.vy = 0;
  assert.equal(entry.flankSplit(far, farBoss).held, false,
    'the pincer only counts within the flank range');

  // Both flanks held for the hold window: the core opens and damage jumps.
  const pincer = room([{ x: 150, y: 260 }, { id: 'guest', x: 150, y: -260 }]);
  const pincerBoss = bosses.createOf('boss_mirror_bastion', pincer, 0, 0, 1, 1);
  entry.update(pincer, pincerBoss, 1.3);
  assert.ok(pincerBoss.coopExposed > 0, 'holding both flanks must expose the core');
  assert.equal(pincerBoss.arming, false, 'and drop the shield flag');
  assert.equal(entry.damageMultiplier(pincer, pincerBoss), 1.25,
    'an exposed core takes amplified damage');

  // The exposure is temporary; the shield comes back.
  entry.update(pincer, pincerBoss, 20);
  assert.equal(pincerBoss.coopExposed, 0);
  assert.equal(entry.damageMultiplier(pincer, pincerBoss), 0.15);
}

// ---------------------------------------------------------------------------
// 4. 极性分裂: seats alternate + / -, and the anchor only charges with a PAIR
//    inside it. A single polarity must never be enough.
// ---------------------------------------------------------------------------
{
  const entry = bosses.REGISTRY['boss_polarity_split'];
  const game = room([{ x: 0, y: 0 }, { id: 'guest', x: 0, y: 0 }]);
  const boss = bosses.createOf('boss_polarity_split', game, 0, 0, 1, 1);
  const zone = entry.anchor(boss);
  assert.equal(Math.round(Math.hypot(zone.x, zone.y)), bosses.TUNING.anchorOrbit,
    'the anchor orbits at the declared radius');

  // Seat order decides polarity, so host is + and the first guest is -.
  assert.equal(bosses.polarityOfSeat('host'), 1);
  assert.equal(bosses.polarityOfSeat('guest'), -1);
  assert.equal(bosses.polarityOfSeat('guest-2'), 1);
  assert.equal(bosses.polarityOfSeat('guest-3'), -1);

  // Only the + pilot inside: no pairing, so no charge.
  place(game, 'host', zone.x, zone.y);
  place(game, 'guest', 4000, 4000);
  const alone = entry.anchorStatus(game, boss);
  assert.equal(alone.paired, false, 'one polarity alone must not charge the anchor');
  assert.equal(alone.plus, 1);

  // One of each inside: paired.
  place(game, 'guest', zone.x + 20, zone.y);
  const paired = entry.anchorStatus(game, boss);
  assert.equal(paired.plus, 1);
  assert.equal(paired.minus, 1);
  assert.equal(paired.paired, true, 'a + and a - together must charge the anchor');

  // Drive the real update. The anchor advances before it is scored, so the
  // pilots are parked where the zone will actually be.
  const spin = bosses.TUNING.anchorSpin;
  const hold = bosses.TUNING.polarityHoldSeconds;
  const angle = hold * spin;
  const ax = Math.cos(angle) * bosses.TUNING.anchorOrbit;
  const ay = Math.sin(angle) * bosses.TUNING.anchorOrbit;

  const pairRoom = room([{ x: ax, y: ay }, { id: 'guest', x: ax, y: ay }]);
  const pairBoss = bosses.createOf('boss_polarity_split', pairRoom, 0, 0, 1, 1);
  entry.update(pairRoom, pairBoss, hold);
  assert.ok(pairBoss.coopExposed > 0, 'a held pair must break the shackle');
  assert.equal(entry.damageMultiplier(pairRoom, pairBoss), 1.3);

  const loneRoom = room([{ x: ax, y: ay }, { id: 'guest', x: 4000, y: 4000 }]);
  const loneBoss = bosses.createOf('boss_polarity_split', loneRoom, 0, 0, 1, 1);
  entry.update(loneRoom, loneBoss, hold);
  assert.equal(loneBoss.coopExposed, 0,
    'a lone pilot must not be able to break the shackle, whatever its polarity');
  assert.equal(entry.damageMultiplier(loneRoom, loneBoss), 0.35);
}

// ---------------------------------------------------------------------------
// 5. Fail-open: a disconnected guest must never leave an unkillable boss.
// ---------------------------------------------------------------------------
{
  for (const entry of bosses.ROTATION) {
    const game = room([{ x: 0, y: 0 }, { id: 'guest', x: 100, y: 0 }]);
    const boss = entry.create(game, 0, 0, 1, 1);
    const shielded = encounters.modifyBossDamage(game, boss, 100);
    assert.ok(shielded < 100,
      `${entry.type} must be shielded while the encounter is hosted`);
    game.lanCoop.rtc.connected = false;
    assert.equal(encounters.modifyBossDamage(game, boss, 100), 100,
      `${entry.type} must fail open once the guest is gone, or the run is unwinnable`);
  }
  // A solo boss is never touched by the co-op damage path.
  assert.equal(encounters.modifyBossDamage(
    room([{ x: 0, y: 0 }, { id: 'guest', x: 0, y: 0 }]), { type: 'boss_nexus' }, 100), 100);
}

// ---------------------------------------------------------------------------
// 6. Dispatch: the reward reaches the whole team, and the co-op overlay is
//    painted on BOTH sides from the same function.
// ---------------------------------------------------------------------------
{
  const game = room([{ x: 0, y: 0 }, { id: 'guest', x: 50, y: 0 }]);
  game.player.hp = 40;
  game.lanCoop.allies.get('guest').hp = 40;
  const boss = encounters.createDualBoss(game, 0, 0, 1, 1);
  encounters.bonusOnVictory(game, boss);
  assert.equal(game.player.crystals, 35);
  assert.ok(game.player.hp > 40, 'the host is repaired');
  assert.ok(game.lanCoop.allies.get('guest').hp > 40,
    'and so is every other pilot, not just the legacy ally');

  // The guest paints from the replicated snapshot, with no second simulation.
  const guestView = {
    isGuestWorldView: true,
    lanCoop: { currentRenderState: { localPlayerId: 'guest', players: [
      { id: 'host', x: 10, y: 0, hp: 100 },
      { id: 'guest', x: -10, y: 0, hp: 100 }
    ] } }
  };
  assert.deepEqual(bosses.visibleTeam(guestView).map(e => e.id), ['host', 'guest'],
    'the guest render must read the party from players[]');

  for (const entry of bosses.ROTATION) {
    const { ctx, calls } = stubCtx();
    assert.doesNotThrow(() => bosses.render(ctx, guestView, entry.create(game, 0, 0, 1, 1)),
      `${entry.type} must render on the guest without the host world`);
    assert.ok(calls.fillText > 0, `${entry.type} must paint its state readout`);
  }

  // A solo boss never enters the co-op overlay.
  const { ctx, calls } = stubCtx();
  encounters.renderBoss(ctx, { lanCoop: null }, { type: 'boss_nexus' });
  assert.equal(calls.fillText + calls.arc, 0, 'a solo boss must not draw the co-op overlay');
}

console.log('Co-op bosses passed: registry rotation, N-point capture, left/right '
  + 'pincer, polarity pairing, team reward, guest render from the snapshot, and '
  + 'fail-open on disconnect.');
