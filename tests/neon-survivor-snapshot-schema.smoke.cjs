/* Run: node tests/neon-survivor-snapshot-schema.smoke.cjs
 *
 * The co-op state contract (js/network/schema.js) exists so a replicated field
 * is described ONCE and the producer, the consumer and the validator all derive
 * from that description. Before it, a field could exist on one side only:
 * `lastSlashFx` and the aegis flags were written by the host and read by nobody,
 * `regen` was recomputed on the guest from a second copy of the formula, and an
 * ally carried two names for every dash value (`charges` and `dashCharges`).
 *
 * These assertions are the structural guarantee. They fail if a field is
 * declared but never applied, if the wire carries an undeclared field, or if a
 * producer cap and the validator cap drift apart -- the last of which is how
 * `gems` ended up with zero margin, where raising the cap by one would have made
 * the validator reject EVERY frame (indistinguishable from the
 * "stuck on 正在同步房主战场" freeze).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixture = require('./helpers/snapshot-fixture.cjs');

const ROOT = fixture.ROOT;
const read = part => fs.readFileSync(path.join(ROOT, part), 'utf8');

// ---------------------------------------------------------------------------
// 1. The producer's caps and the validator's caps cannot disagree, AND a world
//    at every declared cap has to arrive whole. The second half is the point:
//    the declared caps once asked for 80 KB against an 18 KB budget, so the trim
//    fired in every crowded late game and silently deleted whole layers -- a
//    guest could not see the enemy bullets it had to dodge.
// ---------------------------------------------------------------------------
{
  const { box, frame, spec, schema } = fixture.frame(1000);
  const coop = box.window.NeonLanCoop;
  for (const entry of spec) {
    assert.ok(entry.cap <= entry.safeCap,
      `${entry.name}: producer cap ${entry.cap} must not exceed its safe cap ${entry.safeCap}`);
    assert.ok(entry.safeCap > entry.cap,
      `${entry.name} needs margin: gems once had none, so raising its cap by one `
      + 'would have made the validator reject EVERY frame');
  }
  assert.equal(coop.safeSnapshot(frame), true,
    'a maximal world must still produce a frame the validator accepts');
  assert.ok(schema.byteLength(JSON.stringify(frame)) <= coop.SNAPSHOT_LIMIT,
    'and one that respects the wire budget, measured in BYTES not UTF-16 units');
  const delivered = schema.decodeFrame(frame);
  for (const entry of spec) {
    assert.equal(delivered[entry.name].length, entry.cap,
      `${entry.name} must arrive whole when every layer is at its cap`);
  }
}

// ---------------------------------------------------------------------------
// 2. The shape is a contract: the ordered key lists are asserted, so adding or
//    removing a replicated field has to be deliberate.
// ---------------------------------------------------------------------------
{
  const { frame, spec, schema } = fixture.frame(5);
  assert.deepEqual(Array.from(Object.keys(frame)), [
    'type', 'seq', 'round', 'time', 'level', 'kills', 'difficulty', 'mode',
    'teamXP', 'phase', 'rescue', 'resonance', 'host', 'guest',
    ...spec.map(entry => entry.name),
    'protocolVersion', 'players', 'localPlayerId', 'strings'
  ], 'the frame envelope must match the declared contract');

  // The host block and the guest block are the SAME pilot shape, which is what
  // makes "a field exists on one side only" structurally impossible.
  // Ship projections are legitimately absent for a ship that has none, so they
  // are excluded here and covered by the closure assertion below.
  const declared = Array.from(schema.PILOT_FIELDS
    .filter(field => field.scope !== 'remote' && field.kind !== 'projection'),
  field => field.name);
  const hostOnly = Array.from(declared).filter(name => !(name in frame.host));
  assert.deepEqual(hostOnly, [], 'the host block must carry every non-remote field');
  const guestOnly = Array.from(declared).filter(name => !(name in frame.guest));
  assert.deepEqual(guestOnly, [], 'and so must the guest block');
  assert.ok(Object.keys(frame.host).length >= 30,
    'the host used to send only 23 fields, which is why guest parity was broken');
}

// ---------------------------------------------------------------------------
// 3. Two-way closure: the wire carries nothing undeclared, and every declared
//    field is actually applied to the guest view.
// ---------------------------------------------------------------------------
{
  const { box, frame, spec } = fixture.frame(5);
  const schema = box.window.NeonLanSchema;
  const known = new Set(schema.FRAME_FIELDS);
  for (const key of Object.keys(frame)) {
    assert.ok(known.has(key), `the wire carries undeclared frame field "${key}"`);
  }
  for (const entry of spec) {
    const layer = frame[entry.name];
    const allowed = new Set(['id', ...entry.fields]);
    for (const key of Object.keys(layer)) {
      assert.ok(allowed.has(key), `${entry.name} carries undeclared column "${key}"`);
    }
    // A column exists only when some entity carries the field, so a layer whose
    // world populates every field must carry every declared column.
    assert.equal(Object.keys(layer).length, entry.fields.length + 1,
      `${entry.name} must carry every declared column plus id`);
    assert.ok(Object.values(layer).every(column => Array.isArray(column)),
      `${entry.name} columns must all be arrays`);
  }
  // Strings are interned once per frame instead of once per entity.
  assert.ok(Array.isArray(frame.strings) && frame.strings.length > 0,
    'a frame with string fields must carry an interned string table');
  assert.ok(frame.strings.length <= schema.STRING_TABLE_CAP,
    'and the table must stay bounded');
  assert.ok(!('strings' in schema.decodeFrame(frame)),
    'the table is wire-only: a decoded frame must not carry it');
  assert.ok(Object.keys(frame.guest).every(key =>
    schema.PILOT_FIELDS.some(field => field.name === key)),
  'the guest block must carry pilot fields only -- entity layers belong to the frame');

  // Applied: build a view and check every declared field lands on it.
  const view = Object.create({});
  schema.applyPilot(view, frame.guest, { scope: 'remote' });
  for (const field of schema.PILOT_FIELDS) {
    if (field.scope === 'identity' || field.kind === 'projection') continue;
    assert.ok(field.name in view,
      `updateView must apply the declared pilot field "${field.name}"`);
  }
  assert.equal(view.dashCharges, frame.guest.dashCharges,
    'canonical dash charges must arrive verbatim');
  assert.equal(view.dashTimeLeft, frame.guest.dashTimeLeft,
    'and so must the dash countdown (it used to be called `dash`)');
  assert.ok('phantom' in view || 'astra' in view || view.shipId === 'riftblade',
    'the ship projection travels under its runtime name');
}

// ---------------------------------------------------------------------------
// 4. Round-trip: read then apply reproduces the value for every kind.
// ---------------------------------------------------------------------------
{
  const { box, spec } = fixture.frame(5);
  const schema = box.window.NeonLanSchema;
  const pilot = fixture.pilot('guest', 'astra');
  pilot.astra = { mana: 120, maxMana: 180 };
  const wire = schema.readPilot(pilot, { scope: 'remote', identity: { name: '队友', color: '#fff' } });
  const view = Object.create({});
  schema.applyPilot(view, wire, { scope: 'remote' });
  for (const field of schema.PILOT_FIELDS) {
    if (field.scope === 'identity' || field.kind === 'projection') continue;
    const sent = wire[field.name];
    const got = view[field.name];
    if (Array.isArray(sent)) {
      assert.deepEqual(Array.from(got), Array.from(sent), `${field.name} must round-trip`);
    } else if (sent && typeof sent === 'object') {
      assert.deepEqual({ ...got }, { ...sent }, `${field.name} must round-trip`);
    } else {
      // null is a legitimate value (an expired effect), not an absence.
      assert.deepEqual(got, sent === undefined ? field.fallback : sent,
        `${field.name} must round-trip`);
    }
  }
  // A non-finite value must never reach the wire as Infinity or NaN.
  const dirty = schema.readPilot({ shipId: 'riftblade', x: NaN, hp: Infinity, y: 1e50 },
    { scope: 'remote' });
  assert.equal(dirty.x, 0, 'NaN becomes the field invalid value, not NaN');
  assert.equal(dirty.hp, 0, 'Infinity becomes the field invalid value');
  assert.equal(dirty.y, 1e7, 'out-of-range values are clamped');
}

// ---------------------------------------------------------------------------
// 5. The required set stays minimal, and the roster scope stays lean.
// ---------------------------------------------------------------------------
{
  const { box, frame } = fixture.frame(5);
  const schema = box.window.NeonLanSchema;
  assert.deepEqual(Array.from(schema.requiredPilotFields()), ['x', 'y'],
    'only position is required; everything else has a declared fallback');
  const roster = schema.readPilot(fixture.pilot('guest', 'riftblade'), { scope: 'roster' });
  for (const heavy of ['weapons', 'passives', 'dashUpgrades', 'limitBreaks', 'choices']) {
    assert.ok(!(heavy in roster), `players[] must not carry the loadout field "${heavy}"`);
  }
  assert.ok('x' in roster && 'shipId' in roster, 'but it must carry what rendering needs');
  assert.ok(frame.players.every(entry => Object.isFrozen(entry)), 'roster entries stay frozen');
}

// ---------------------------------------------------------------------------
// 6. Protocol version guard: a NEWER contract is refused, not misread.
// ---------------------------------------------------------------------------
{
  const { box, frame } = fixture.frame(5);
  const coop = box.window.NeonLanCoop;
  const schema = box.window.NeonLanSchema;
  assert.equal(schema.VERSION, 4, 'the contract version is part of the contract');
  assert.equal(frame.protocolVersion, schema.VERSION);
  assert.equal(coop.safeSnapshot(frame), true);
  assert.equal(coop.safeSnapshot({ ...frame, protocolVersion: schema.VERSION + 1 }), false,
    'a newer protocol must be refused rather than silently misread');
  const { protocolVersion, ...legacy } = frame;
  assert.equal(coop.safeSnapshot(legacy), true,
    'a peer that omits the version is still accepted');
}

// ---------------------------------------------------------------------------
// 7. The declarations are the only place these numbers live.
// ---------------------------------------------------------------------------
{
  const coop = read('js/network/coop.js');
  assert.doesNotMatch(coop, /TRIMMABLE/,
    'the trim table must not be duplicated in the transport');
  assert.doesNotMatch(coop, /length <= \d+ &&/,
    'the validator must not restate the caps by hand');
  assert.doesNotMatch(coop, /particles: limit\(/,
    'the producer must not restate the entity field lists by hand');
  // The transport decides WHAT to send; the contract decides how it travels.
  assert.doesNotMatch(coop, /readEntities/,
    'the transport must not encode entity layers itself');
  assert.match(coop, /schema\.encodeFrame\(frame\)/,
    'the transport must put its decision through the contract codec');
  assert.doesNotMatch(coop, /companionDrones:\s*\[/,
    'the guest block must not carry a second copy of an entity layer');
  const view = read('js/network/world-view.js');
  assert.doesNotMatch(view, /player\.dashSlashDmg = 95/,
    'the consumer must not hardcode replicated values');
  const players = read('js/players.js');
  assert.doesNotMatch(players, /\bcharges:/,
    'the remote pilot must not carry a second name for its dash charges');
  const rtc = read('js/network/rtc.js');
  assert.doesNotMatch(rtc, /data\.length > 40000/,
    'the channel guard must measure bytes, not UTF-16 units');
}

console.log('Snapshot schema passed: caps agree with the validator, the shape is '
  + 'declared once, every field round-trips and is applied, and a newer protocol '
  + 'is refused.');
