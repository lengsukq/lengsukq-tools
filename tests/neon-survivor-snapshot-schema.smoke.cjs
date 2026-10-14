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
// 1. The producer's caps and the validator's caps cannot disagree.
//    A world with 1000 of every entity must still produce a frame the validator
//    accepts, which is only true while every cap is at or below its safe cap.
// ---------------------------------------------------------------------------
{
  const { box, frame } = fixture.frame(1000);
  const coop = box.window.NeonLanCoop;
  const schema = box.window.NeonLanSchema;
  for (const spec of schema.ENTITY_ARRAYS) {
    assert.ok(spec.cap <= spec.safeCap,
      `${spec.name}: producer cap ${spec.cap} must not exceed its safe cap ${spec.safeCap}`);
  }
  assert.equal(coop.safeSnapshot(frame), true,
    'a maximal world must still produce a frame the validator accepts');
  assert.ok(JSON.stringify(frame).length <= coop.SNAPSHOT_LIMIT,
    'and one that respects the wire budget');
  // The synthetic companion entries are appended after the cap, so the safe cap
  // has to leave room for them.
  const drones = schema.ENTITY_ARRAYS.find(spec => spec.name === 'companionDrones');
  assert.ok(drones.safeCap >= drones.cap + 5,
    'companionDrones carries up to 5 synthesised entries beyond its cap');
}

// ---------------------------------------------------------------------------
// 2. The shape is a contract: the ordered key lists are asserted, so adding or
//    removing a replicated field has to be deliberate.
// ---------------------------------------------------------------------------
{
  const { frame, spec } = fixture.frame(5);
  assert.deepEqual(Array.from(Object.keys(frame)), [
    'type', 'seq', 'round', 'time', 'level', 'kills', 'difficulty', 'mode',
    'teamXP', 'phase', 'rescue', 'resonance', 'host', 'guest',
    ...spec.map(entry => entry.name),
    'protocolVersion', 'players', 'localPlayerId'
  ], 'the frame envelope must match the declared contract');

  // The host block and the guest block are the SAME pilot shape, which is what
  // makes "a field exists on one side only" structurally impossible.
  const schema = fixture.sandbox().window.NeonLanSchema;
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
  // The guest block also carries the two arrays synthesised from its own
  // loadout (companion drones, orbiters), which are declared as entity arrays.
  const pilotNames = new Set([
    ...schema.PILOT_FIELDS.map(field => field.name), ...schema.ARRAY_NAMES
  ]);
  for (const key of Object.keys(frame.guest)) {
    assert.ok(pilotNames.has(key), `the wire carries undeclared guest field "${key}"`);
  }
  for (const entry of spec) {
    const entity = frame[entry.name][0];
    if (!entity) continue;
    const allowed = new Set(['id', ...entry.fields]);
    for (const key of Object.keys(entity)) {
      assert.ok(allowed.has(key),
        `${entry.name} carries undeclared field "${key}"`);
    }
  }

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
  assert.equal(schema.VERSION, 3, 'the contract version is part of the contract');
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
  const view = read('js/network/world-view.js');
  assert.doesNotMatch(view, /player\.dashSlashDmg = 95/,
    'the consumer must not hardcode replicated values');
  const players = read('js/players.js');
  assert.doesNotMatch(players, /\bcharges:/,
    'the remote pilot must not carry a second name for its dash charges');
}

console.log('Snapshot schema passed: caps agree with the validator, the shape is '
  + 'declared once, every field round-trips and is applied, and a newer protocol '
  + 'is refused.');
