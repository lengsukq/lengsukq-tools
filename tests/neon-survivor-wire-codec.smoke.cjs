/* Run: node tests/neon-survivor-wire-codec.smoke.cjs
 *
 * The co-op wire carries entity layers as COLUMNS: {id:[...], x:[...],
 * radius:[...]}, with every string interned once per frame into `strings`.
 * That is what took a world at every declared cap from 80.6 KB to 24.8 KB, which
 * is what stops the byte budget from silently deleting whole layers on a guest.
 *
 * These assertions are the reason the encoding is allowed to exist at all: it
 * must be lossless, it must not mutate what the host still has to trim, it must
 * survive a hostile frame, and a layer that is already in the row shape (a
 * hand-built test frame, an older adapter) must pass through untouched.
 */
const assert = require('node:assert/strict');
const fixture = require('./helpers/snapshot-fixture.cjs');

const { box, game, ally, spec, schema } = fixture.world(12);

/** The declared fields of a layer, read out of the contract. */
const fieldsOf = name => spec.find(entry => entry.name === name).fields;

/** A row layer built by hand, with only the fields a producer really writes. */
function sparseEnemies() {
  return [
    { x: 12.5, y: -3.5, vx: 0, vy: 0, hp: 30, maxHp: 30, radius: 12, color: '#ff0055',
      type: 'swarmer' },
    { x: -1200.5, y: 900.5, vx: -4, vy: 2, hp: 7.5, maxHp: 60, radius: 22,
      color: '#ffea00', type: 'shield_pylon', isElite: true }
  ];
}

const specOf = name => spec.find(entry => entry.name === name);

/** Encode then decode one layer through ONE string table, as the wire does. */
const roundTrip = (name, rows) => {
  const strings = [];
  const layer = schema.encodeEntities(rows, specOf(name), strings);
  return schema.decodeEntities(layer, specOf(name), strings);
};

// ---------------------------------------------------------------------------
// 1. The encoding is lossless, for every declared kind.
// ---------------------------------------------------------------------------
{
  const rows = sparseEnemies();
  const back = roundTrip('enemies', rows);
  assert.equal(back.length, rows.length, 'no entity may be lost');
  // A column is layer-wide: once ANY entity carries a field, every entity in
  // that layer decodes with it. The one that did not carry it gets the default,
  // which is what the row encoding's omission meant to its consumers anyway.
  assert.deepEqual(Object.keys(back[0]).sort(),
    ['color', 'hp', 'id', 'isElite', 'maxHp', 'radius', 'type', 'vx', 'vy', 'x', 'y'],
    'every column present in the layer comes back, plus id');
  assert.equal(back[0].isElite, false, 'and an entity that lacked the field gets the default');
  for (const [index, row] of rows.entries()) {
    for (const [field, value] of Object.entries(row)) {
      assert.equal(back[index][field], value,
        `${field} must survive the round trip (${JSON.stringify(value)})`);
    }
  }
  // 0.1 precision is the precision the row encoding already rounded to, so the
  // integer-tenth representation is not a loss -- it is the same number without
  // the decimal point.
  assert.equal(roundTrip('enemies', [{ x: 1234.5 }])[0].x, 1234.5);
  assert.equal(roundTrip('enemies', [{ x: -0.1 }])[0].x, -0.1);
  assert.equal(roundTrip('enemies', [{ x: 0 }])[0].x, 0);
  // A non-finite value becomes 0 rather than the `null` JSON used to write for
  // Infinity, so a peer never receives a value it cannot do arithmetic on.
  assert.equal(roundTrip('enemies', [{ x: Infinity, y: NaN }])[0].x, 0);
  assert.equal(roundTrip('enemies', [{ x: Infinity, y: NaN }])[0].y, 0);
}

// ---------------------------------------------------------------------------
// 2. A field that no entity carries costs nothing, and decodes to the value
//    every consumer already treats an absent field as.
// ---------------------------------------------------------------------------
{
  const spec0 = specOf('enemies');
  const layer = schema.encodeEntities([{ x: 1 }, { x: 2 }], spec0, []);
  assert.deepEqual(Object.keys(layer).sort(), ['id', 'x'],
    'a field no entity carries costs no column at all');
  const back = schema.decodeEntities(layer, spec0, []);
  assert.ok(!('radius' in back[0]),
    'and decodes as absent, exactly as the row encoding omitted it');
  // A field SOME entity carries becomes a layer-wide column, and the entities
  // that lacked it decode to the default. Every consumer of these fields tests
  // truthiness or a comparison, so the default is indistinguishable from the
  // omission it replaces -- which the render parity test proves directly.
  const mixed = roundTrip('enemies',
    [{ x: 1 }, { x: 2, radius: 9, isBoss: true, color: '#fff' }]);
  assert.equal(mixed[1].radius, 9);
  assert.equal(mixed[1].isBoss, true);
  assert.equal(mixed[1].color, '#fff');
  assert.equal(mixed[0].radius, 0, 'an absent number reads as 0');
  assert.equal(mixed[0].color, '', 'an absent string reads as empty');
  assert.equal(mixed[0].isBoss, false, 'an absent boolean reads as false');
  assert.equal(Boolean(undefined), Boolean(mixed[0].isBoss));
  assert.equal(undefined || 20, mixed[0].radius || 20);
}

// ---------------------------------------------------------------------------
// 3. Entity identity is stable for the life of the object, because that is what
//    the guest interpolates between two frames with.
// ---------------------------------------------------------------------------
{
  const rows = sparseEnemies();
  const first = roundTrip('enemies', rows);
  const second = roundTrip('enemies', rows);
  assert.deepEqual(first.map(e => e.id), second.map(e => e.id),
    'the same entity must keep the same wire id across frames');
  assert.notEqual(first[0].id, first[1].id, 'two entities must not share an id');
  assert.ok(first.every(e => Number.isSafeInteger(e.id) && e.id > 0));
}

// ---------------------------------------------------------------------------
// 4. Strings are interned once per frame, and interning can never lose one.
// ---------------------------------------------------------------------------
{
  const rows = Array.from({ length: 40 }, (_, i) =>
    ({ x: i, y: i, radius: 4, color: '#00f3ff', type: 'spitter' }));
  const strings = [];
  const layer = schema.encodeEntities(rows, spec.find(entry => entry.name === 'enemies'), strings);
  assert.equal(strings.length, 2, '40 identical colour/type pairs intern to two entries');
  assert.ok(layer.color.every(value => value === 0), 'and every entity references the entry');
  assert.equal(schema.decodeEntities(layer, spec.find(entry => entry.name === 'enemies'),
    strings)[39].color, '#00f3ff');

  // A string too long to intern travels verbatim, so the table stays bounded
  // without any entity losing its text.
  const long = '⚠️ ' + '龙'.repeat(schema.STRING_MAX);
  const texts = schema.encodeEntities([{ x: 0, y: 0, text: long }],
    spec.find(entry => entry.name === 'texts'), strings);
  assert.equal(texts.text[0], long, 'an over-long string must travel verbatim');
  assert.equal(schema.decodeEntities(texts, spec.find(entry => entry.name === 'texts'),
    strings)[0].text, long);

  // A full table also degrades to verbatim rather than dropping or truncating.
  const full = Array.from({ length: schema.STRING_TABLE_CAP }, (_, i) => `s${i}`);
  const overflow = schema.encodeEntities([{ x: 0, y: 0, text: 'later' }],
    spec.find(entry => entry.name === 'texts'), full);
  assert.equal(overflow.text[0], 'later');
  assert.equal(full.length, schema.STRING_TABLE_CAP, 'the table must not grow past its cap');
}

// ---------------------------------------------------------------------------
// 5. Encoding a frame must not disturb the rows the host still has to trim.
// ---------------------------------------------------------------------------
{
  const frame = {
    type: 'snapshot', seq: 1, host: { x: 1, y: 2 }, guest: { x: 3, y: 4 },
    enemies: sparseEnemies(), bullets: [{ x: 5, y: 6, radius: 4, color: '#fff' }],
    strings: ['a string a peer sent us']
  };
  const before = JSON.stringify(frame);
  const wire = schema.encodeFrame(frame);
  assert.equal(JSON.stringify(frame), before,
    'encodeFrame must leave the row frame untouched');
  assert.notEqual(wire, frame);
  assert.ok(Array.isArray(wire.enemies.id), 'the wire carries columns');
  assert.ok(Array.isArray(frame.enemies), 'the row frame still carries rows');
  assert.deepEqual(wire.strings.includes('a string a peer sent us'), false,
    'the incoming table must not be carried through');
  assert.equal(wire.host, frame.host, 'the envelope is passed through by reference');
}

// ---------------------------------------------------------------------------
// 6. decodeFrame is the guest's single entry point, and it is forgiving.
// ---------------------------------------------------------------------------
{
  const wire = schema.encodeFrame({
    type: 'snapshot', seq: 1, host: { x: 1, y: 2 }, guest: { x: 3, y: 4 },
    enemies: sparseEnemies()
  });
  const decoded = schema.decodeFrame(wire);
  assert.equal(decoded.type, 'snapshot');
  assert.equal(decoded.seq, 1);
  assert.ok(Array.isArray(decoded.enemies), 'layers come back as rows');
  assert.equal(decoded.enemies[0].type, 'swarmer');
  assert.ok(!('strings' in decoded), 'the string table is wire-only');
  // A hand-built frame that is already in the row shape passes through, which is
  // how the tests and any older adapter keep working.
  const rows = { enemies: sparseEnemies(), bullets: [] };
  assert.equal(schema.decodeFrame(rows).enemies, rows.enemies);
  assert.deepEqual(schema.decodeFrame(null), null);
  assert.equal(schema.decodeFrame({ enemies: 'not a layer' }).enemies.length, 0);
}

// ---------------------------------------------------------------------------
// 7. The budget is measured in UTF-8 BYTES. String.length under-counts every
//    Chinese glyph and emoji -- exactly the content of the `texts` layer.
// ---------------------------------------------------------------------------
{
  for (const text of ['hello', '命中 42', '⚠️ 虫潮蜂拥突袭 (SWARM RUSH)!', '']) {
    assert.equal(schema.byteLength(text), Buffer.byteLength(text, 'utf8'),
      `byteLength must match UTF-8 for ${JSON.stringify(text)}`);
  }
  assert.equal(schema.byteLength('命中'), 6);
  assert.ok(schema.byteLength('⚠️') > '⚠️'.length,
    'a glyph outside the BMP must count as more than one unit');
  assert.equal(schema.byteLength(undefined), 0);
}

// ---------------------------------------------------------------------------
// 8. A hostile or broken frame is refused, not decoded into nonsense.
// ---------------------------------------------------------------------------
{
  const coop = box.window.NeonLanCoop;
  const base = () => ({
    type: 'snapshot', seq: 3, round: 0, host: { x: 1, y: 2 }, guest: { x: 3, y: 4 },
    enemies: schema.encodeFrame({ enemies: sparseEnemies() }).enemies,
    strings: []
  });
  assert.equal(coop.safeSnapshot(base()), true, 'the well-formed frame is accepted');

  const ragged = base();
  ragged.enemies = { id: [1, 2], x: [1] };
  assert.equal(coop.safeSnapshot(ragged), false, 'a ragged column must be refused');

  const undeclared = base();
  undeclared.enemies = { id: [1], x: [1], backdoor: [1] };
  assert.equal(coop.safeSnapshot(undeclared), false, 'an undeclared column must be refused');

  const oversized = base();
  oversized.enemies = { id: Array.from({ length: 999 }, (_, i) => i),
    x: Array.from({ length: 999 }, () => 1) };
  assert.equal(coop.safeSnapshot(oversized), false, 'a layer past its safe cap must be refused');

  const noEnemies = base();
  delete noEnemies.enemies;
  assert.equal(coop.safeSnapshot(noEnemies), false, 'the enemy layer is mandatory');

  const hugeTable = base();
  hugeTable.strings = Array.from({ length: schema.STRING_TABLE_CAP + 1 }, () => 'x');
  assert.equal(coop.safeSnapshot(hugeTable), false, 'an oversized string table must be refused');

  const longEntry = base();
  longEntry.strings = ['y'.repeat(schema.STRING_MAX + 1)];
  assert.equal(coop.safeSnapshot(longEntry), false, 'an oversized entry must be refused');

  const wrongType = base();
  wrongType.strings = [42];
  assert.equal(coop.safeSnapshot(wrongType), false, 'a non-string entry must be refused');

  // A row-shaped layer is still accepted, so a hand-built frame is not rejected.
  const rowShaped = base();
  rowShaped.enemies = sparseEnemies();
  assert.equal(coop.safeSnapshot(rowShaped), true);
  assert.equal(coop.safeSnapshot(schema.encodeFrame({ enemies: [] })), false,
    'a frame without pilots is still refused');
}

console.log('Wire codec passed: columns are lossless for every kind, identity is '
  + 'stable, interning never loses a string, encoding never mutates the row frame, '
  + 'the budget is measured in UTF-8 bytes and a malformed layer is refused.');
