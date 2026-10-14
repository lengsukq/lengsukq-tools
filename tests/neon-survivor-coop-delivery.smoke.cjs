/* Run: node tests/neon-survivor-coop-delivery.smoke.cjs
 *
 * WHAT WENT WRONG, AND WHY THIS FILE EXISTS
 * The host declared caps for fourteen entity layers that together asked for
 * 80.6 KB, against a snapshot budget of 18 KB. The budget therefore won in every
 * crowded late game, and the trim order sacrificed `gems`, then `bullets`, then
 * `enemyBullets` before touching `enemies`. A guest in a late game received:
 *
 *   enemies 86/90, bullets 0/120, enemyBullets 0/150, gems 0/150
 *
 * It could not see the enemy fire it had to dodge. That is not a cosmetic
 * difference -- it is a fairness bug, and the user reported it as "房客的特效很
 * 垃圾" long before anyone measured the payload.
 *
 * These assertions are the guarantee that a guest receives the same WORLD, and
 * that when the budget genuinely cannot be met the loss falls on decoration
 * first, feedback next, threat after that, and never on the layer a guest has to
 * react to. Both halves fail against the pre-fix code.
 */
const assert = require('node:assert/strict');
const fixture = require('./helpers/snapshot-fixture.cjs');

const CAPS = ['enemies', 'bullets', 'enemyBullets', 'gems'];

/** A host world with every layer past its declared cap. */
function crowded(textLength = 0) {
  const built = fixture.world(1000);
  const { box, game, ally, coop, spec, schema } = built;
  game.players = { list: () => [{ id: 'host', state: game.player },
    { id: 'guest', state: ally }] };
  if (textLength > 0) {
    // `texts` has no length cap on its strings, so this is how a frame is pushed
    // over the budget without inventing entities the game cannot produce.
    game.texts = Array.from({ length: 40 }, (_, i) => ({
      x: i, y: i, text: '潮'.repeat(textLength), color: '#ff3300', size: 18,
      life: 1, maxLife: 1
    }));
  }
  const send = () => box.window.NeonLanCoop.boundedSnapshot(game, ally, 7, coop.resonance, 'guest');
  return { ...built, send, spec, schema, box };
}

const delivered = (built, wire) => built.schema.decodeFrame(wire);

// ---------------------------------------------------------------------------
// 1. The world the host can actually produce must arrive WHOLE. This is the
//    assertion that fails against the pre-fix code.
// ---------------------------------------------------------------------------
{
  const built = crowded();
  const wire = built.send();
  const size = built.schema.byteLength(JSON.stringify(wire));
  assert.ok(size <= built.box.window.NeonLanCoop.SNAPSHOT_LIMIT,
    `a frame at every declared cap must fit the budget (was ${size} bytes)`);
  const got = delivered(built, wire);
  for (const entry of built.spec) {
    assert.equal(got[entry.name].length, entry.cap,
      `${entry.name} must arrive whole: the host produces ${entry.cap} and the `
      + `guest must receive ${entry.cap}`);
  }
  // And nothing about the round trip may be lossy on the way.
  assert.equal(got.enemies.length, wire.enemies.id.length);
  assert.ok(got.enemyBullets.every(b => Number.isFinite(b.x) && Number.isFinite(b.y)));
}

// ---------------------------------------------------------------------------
// 2. A realistic late game -- the fields the producers really write, not the
//    worst case -- must also arrive whole.
// ---------------------------------------------------------------------------
{
  const built = fixture.world(1000);
  const { box, game, ally, coop, spec, schema } = built;
  game.players = { list: () => [{ id: 'host', state: game.player },
    { id: 'guest', state: ally }] };
  // Trim each layer down to the sparse field set a real producer writes: an
  // enemy carries no shield/arming/aimTimer unless it is that kind of enemy.
  const SPARSE = {
    enemies: ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'radius', 'color', 'type'],
    bullets: ['x', 'y', 'vx', 'vy', 'radius', 'color', 'type'],
    enemyBullets: ['x', 'y', 'radius', 'color'],
    gems: ['x', 'y', 'radius', 'type', 'color', 'value']
  };
  for (const [name, keep] of Object.entries(SPARSE)) {
    game[name] = game[name].map(row => Object.fromEntries(
      Object.entries(row).filter(([field]) => keep.includes(field))));
  }
  const wire = box.window.NeonLanCoop.boundedSnapshot(game, ally, 7, coop.resonance, 'guest');
  const got = schema.decodeFrame(wire);
  for (const entry of spec) {
    assert.equal(got[entry.name].length, entry.cap,
      `${entry.name} must arrive whole in a realistic late game too`);
  }
  // The enemy bullet no longer carries `damage`: the guest never resolves
  // collisions and renderEnemyBullets reads x/y/radius/color only.
  assert.ok(!('damage' in wire.enemyBullets),
    'the enemy bullet must not spend bytes on a field no consumer reads');
}

// ---------------------------------------------------------------------------
// 3. When the budget genuinely cannot be met, decoration pays -- not the layer
//    the guest has to dodge.
// ---------------------------------------------------------------------------
{
  const built = crowded(200);
  const wire = built.send();
  const got = delivered(built, wire);
  assert.ok(built.schema.byteLength(JSON.stringify(wire)) <=
    built.box.window.NeonLanCoop.SNAPSHOT_LIMIT, 'the budget is still respected');
  for (const name of CAPS) {
    assert.equal(got[name].length, built.schema.capOf(name),
      `${name} must survive a frame that is only moderately over budget`);
  }
  assert.ok(got.texts.length < 40,
    'the decoration is what pays for the overrun');
}

// ---------------------------------------------------------------------------
// 4. Even a frame that is far over budget keeps the one layer a guest cannot
//    play without, and keeps the boss.
// ---------------------------------------------------------------------------
{
  const built = crowded(20000);
  const wire = built.send();
  const got = delivered(built, wire);
  assert.ok(built.schema.byteLength(JSON.stringify(wire)) <=
    built.box.window.NeonLanCoop.SNAPSHOT_LIMIT, 'the budget wins in the end');
  assert.equal(got.enemyBullets.length, built.schema.capOf('enemyBullets'),
    'the enemy fire is the LAST thing to go: a guest that cannot see it cannot play');
  assert.ok(got.enemies.some(enemy => enemy.isBoss),
    'bosses are never culled, however tight the budget');
  assert.equal(got.texts.length, 0, 'the decoration is gone first');
  assert.equal(got.particles.length, 0);
}

// ---------------------------------------------------------------------------
// 5. The order itself, asserted structurally so a future edit has to be
//    deliberate about which layer it is sacrificing.
// ---------------------------------------------------------------------------
{
  const { schema } = fixture.world(2);
  const order = schema.TRIM_ORDER.map(entry => entry.name);
  const rank = name => order.indexOf(name);
  assert.equal(order.length, 12, 'every trimmable layer must be in the table');
  assert.ok(!order.includes('enemyBullets'),
    'enemy bullets are protected: the guest has to dodge them');
  assert.ok(!order.includes('enemies'),
    'enemies travel through the boss-preserving pass, not the layer trim');
  for (const decoration of ['particles', 'texts', 'shockwaves', 'dashTrails',
    'lightningTethers', 'laserBeams', 'mines', 'blackHoles', 'orbiters',
    'companionDrones']) {
    assert.ok(rank(decoration) >= 0, `${decoration} must be trimmable`);
    assert.ok(rank(decoration) < rank('gems'),
      `${decoration} must be sacrificed before the reward feedback`);
  }
  assert.ok(rank('gems') < rank('bullets'),
    'reward feedback goes before muzzle feedback');
  // The trim floors keep a layer from being emptied before its turn, which is
  // how a dense frame spreads the loss instead of losing one layer entirely.
  for (const entry of schema.TRIM_ORDER) {
    assert.ok(entry.floor > 0, `${entry.name} needs a floor above zero`);
    assert.ok(entry.floor <= entry.cap, `${entry.name}: floor must not exceed its cap`);
  }
}

console.log('Co-op delivery passed: a world at every declared cap arrives whole, a '
  + 'moderate overrun is paid for by decoration, and even an extreme one keeps the '
  + 'enemy fire and the boss.');
