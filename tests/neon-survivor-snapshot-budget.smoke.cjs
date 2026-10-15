/* Run: node tests/neon-survivor-snapshot-budget.smoke.cjs
 *
 * WHAT THIS FILE EXISTS TO CATCH
 * The co-op enemy ceiling now follows the party size: 100 normal enemies in
 * solo, +30 per additional pilot (100/130/160/190). The wire has its own cap,
 * and it has to cover the LARGEST party -- if the host may simulate 190 enemies
 * but the frame only carries 130, a guest is hit by enemies it cannot see.
 *
 * Worse than a mismatch in size is a mismatch in KIND. `cap` is what the
 * producer sends, `safeCap` is what the validator accepts. When the producer
 * cap exceeds the safe cap the validator rejects EVERY frame, which reaches the
 * player as "stuck on 正在同步房主战场" -- a freeze with no error anywhere. The
 * schema comment records that this already happened once with `gems`.
 *
 * So this file pins the three numbers together: the gameplay ceiling, the wire
 * cap, and the byte budget, with `safeSnapshot` proving the first two agree.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fixture = require('./helpers/snapshot-fixture.cjs');

/** The RTCDataChannel's own frame limit, per the budget comment in coop.js. */
const CHANNEL_GUARD = 40000;
/** A maximal world must keep this much of the budget free for future fields. */
const MAX_BUDGET_RATIO = 0.95;

// ---------------------------------------------------------------------------
// 1. The producer's cap and the validator's cap cannot disagree.
// ---------------------------------------------------------------------------
{
  const { spec } = fixture.frame(1000);
  for (const entry of spec) {
    assert.ok(entry.cap <= entry.safeCap,
      `${entry.name}: producer cap ${entry.cap} must not exceed its safe cap ${entry.safeCap}`);
    assert.ok(entry.safeCap > entry.cap,
      `${entry.name} needs margin: raising its cap by one must not make the `
      + 'validator reject every frame');
  }
}

// ---------------------------------------------------------------------------
// 2. The wire enemy cap must cover the largest co-op party the game can build.
//    This is the assertion that ties the gameplay ceiling to the wire contract:
//    raising normalEnemyCap without raising the schema cap fails here, in the
//    test suite, instead of on a guest's screen.
// ---------------------------------------------------------------------------
{
  const { box } = fixture.frame(5);
  vm.runInContext(fixture.read('js/network/encounters.js'), box,
    { filename: 'js/network/encounters.js' });
  const encounters = box.window.NeonLanEncounters;
  assert.ok(encounters, 'NeonLanEncounters must load');

  const solo = { player: { hp: 100 }, enemies: [], lanCoop: null };
  assert.equal(encounters.normalEnemyCap(solo), 100, 'solo keeps the original ceiling');

  const party = guests => ({
    player: { hp: 100 }, enemies: [],
    lanCoop: {
      allies: new Map(Array.from({ length: guests }, (_, i) => {
        const id = ['guest', 'guest-2', 'guest-3'][i];
        return [id, { id, hp: 100, downed: false, disconnected: false }];
      })),
      ally: { id: 'guest', hp: 100, downed: false, disconnected: false },
      rtc: { connected: true, role: 'host' }
    }
  });
  const two = encounters.normalEnemyCap(party(1));
  const three = encounters.normalEnemyCap(party(2));
  const four = encounters.normalEnemyCap(party(3));
  assert.deepEqual([two, three, four], [130, 160, 190],
    'the ceiling grows by 30 per additional pilot');

  const wireCap = box.window.NeonLanSchema.capOf('enemies');
  assert.ok(wireCap >= four,
    `the wire enemy cap (${wireCap}) must cover the four-pilot ceiling (${four}): `
    + 'otherwise a guest is hit by enemies it cannot see');
  assert.ok(box.window.NeonLanSchema.safeCapOf('enemies') >= four,
    'and the validator must accept that many, or every frame is rejected');
}

// ---------------------------------------------------------------------------
// 3. A world with every layer at its declared cap must arrive WHOLE, validate,
//    and leave real headroom in the budget.
// ---------------------------------------------------------------------------
{
  const { box, wire, schema } = fixture.frame(1000);
  const coop = box.window.NeonLanCoop;
  const size = schema.byteLength(JSON.stringify(wire));

  assert.ok(coop.SNAPSHOT_LIMIT < CHANNEL_GUARD,
    `the budget (${coop.SNAPSHOT_LIMIT}) must stay under the channel guard (${CHANNEL_GUARD})`);
  assert.ok(size <= coop.SNAPSHOT_LIMIT,
    `a maximal world must fit the budget: ${size} bytes vs ${coop.SNAPSHOT_LIMIT}`);
  assert.equal(coop.safeSnapshot(wire), true,
    'and must pass the validator: a producer cap above the safe cap rejects EVERY frame');

  const delivered = schema.decodeFrame(wire);
  for (const entry of schema.ENTITY_ARRAYS) {
    assert.equal(delivered[entry.name].length, entry.cap,
      `${entry.name} must arrive whole when every layer is at its cap`);
  }

  const ratio = size / coop.SNAPSHOT_LIMIT;
  assert.ok(ratio < MAX_BUDGET_RATIO,
    `a maximal world spends ${(ratio * 100).toFixed(1)}% of the budget; `
    + `keep it under ${MAX_BUDGET_RATIO * 100}% so the next replicated field has room`);
  console.log(`Snapshot budget passed: maximal world ${size}/${coop.SNAPSHOT_LIMIT} bytes `
    + `(${(ratio * 100).toFixed(1)}%), enemy cap ${schema.capOf('enemies')} `
    + `covers the four-pilot ceiling, validator agrees.`);
}
