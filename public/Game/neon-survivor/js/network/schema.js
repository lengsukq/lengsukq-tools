/* The co-op state contract: every replicated field is declared exactly once.
 *
 * WHY THIS EXISTS
 * The host is authoritative and the guest renders a replicated view, so a
 * field has to be described twice by nature -- once when it is written to the
 * wire, once when it is read back. It used to be described by hand in three
 * places (coop.js snapshot(), world-view.js updateView(), snapshots.js
 * players[]) with no shared declaration, so a field could silently exist on
 * one side only. That is the bug class this module removes: `lastSlashFx` and
 * the aegis flags were written by the host and read by nobody because the
 * consumer had never been told about them, and `regen` was recomputed on the
 * guest from a second copy of the host's formula.
 *
 * The host's own pilot and a remote guest's pilot also used DIFFERENT NAMES for
 * the same values (`dashCharges` vs `charges`, `dashTimeLeft` vs `dash`,
 * `invulnTimer` vs `invuln`, `dashRechargeTimer` vs `recharge`), and an ally
 * object carried both schemes at once, so the two could disagree. There is now
 * one canonical name per value, on the live object and on the wire.
 *
 * LAYERING
 *   - core/simulation/speed.js owns RULES: pure formulas both sides run.
 *   - this module owns SHAPE: which fields exist and how they travel.
 * The guest still does not run the world simulation (27 phases); that is
 * deliberate and unchanged -- determinism, latency, CPU cost and anti-cheat all
 * rule out lockstep. What is shared is every rule it does run and every field it
 * reads.
 *
 * Adding a field is now one edit here. `tests/neon-survivor-snapshot-schema`
 * fails if a declared field is never applied, if the wire carries a field that
 * is not declared, or if the producer's caps and the validator's caps disagree.
 */
(() => {
  'use strict';

  const round = value => Math.round((Number(value) || 0) * 10) / 10;
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const ID_PATTERN = /^[a-z_]{1,30}$/;

  /** `{id: level}` bags: filtered, floored and capped exactly as before. */
  function readBag(values, max) {
    return Object.fromEntries(Object.entries(values || {}).slice(0, max)
      .filter(([name, level]) => ID_PATTERN.test(name) &&
        Number.isFinite(level) && level >= 0 && level <= 100)
      .map(([name, level]) => [name, Math.floor(level)]));
  }

  // Stable wire identity for an entity, so the guest can interpolate between two
  // snapshots. Lives here because it is part of the wire contract, not of any
  // one sender.
  const networkIds = new WeakMap();
  let nextNetworkId = 1;
  const networkId = entity => {
    if (!entity || typeof entity !== 'object') return 0;
    if (!networkIds.has(entity)) networkIds.set(entity, nextNetworkId++);
    return networkIds.get(entity);
  };

  // --- kinds: how a value is read off a live pilot and written onto a view ---
  const KINDS = Object.freeze({
    number: {
      // Clamped, not merely rounded: a non-finite value must become the
      // declared fallback rather than travelling as Infinity or NaN.
      read: (value, descriptor) => {
        // Absent means "not on this pilot" and is omitted from the wire; a
        // present-but-unusable value is replaced by `invalid` (0 unless the
        // field's floor is not 0), so a peer never receives Infinity or NaN.
        if (typeof value !== 'number') return undefined;
        if (!Number.isFinite(value)) return descriptor.invalid ?? 0;
        const min = descriptor.min ?? -1e7;
        const max = descriptor.max ?? 1e7;
        return round(Math.min(max, Math.max(min, value)));
      },
      apply: (target, name, wire, fallback) =>
        { target[name] = typeof wire === 'number' ? wire : fallback; }
    },
    string: {
      read: value => typeof value === 'string' ? value : undefined,
      apply: (target, name, wire, fallback) =>
        { target[name] = typeof wire === 'string' ? wire : fallback; }
    },
    boolean: {
      read: value => typeof value === 'boolean' ? value : undefined,
      apply: (target, name, wire, fallback) =>
        { target[name] = typeof wire === 'boolean' ? wire : fallback; }
    },
    bag: {
      read: (value, descriptor) => readBag(value, descriptor.cap || 12),
      apply: (target, name, wire) => { target[name] = wire || {}; }
    },
    ids: {
      read: (value, descriptor) => Array.isArray(value) ? value.slice(0, descriptor.cap || 5) : [],
      apply: (target, name, wire) => { target[name] = Array.isArray(wire) ? wire : []; }
    },
    nullable: {
      read: value => typeof value === 'string' ? value : null,
      apply: (target, name, wire) => { target[name] = typeof wire === 'string' ? wire : null; }
    },
    /** A bounded transient effect object, or null. Numbers are rounded. */
    effect: {
      read: value => {
        if (!value || typeof value !== 'object' || !(finite(value.life) > 0)) return null;
        return {
          x1: round(value.x1), y1: round(value.y1),
          x2: round(value.x2), y2: round(value.y2),
          life: round(value.life), maxLife: round(value.maxLife || .28),
          fire: Boolean(value.fire), cryo: Boolean(value.cryo),
          precise: Boolean(value.precise)
        };
      },
      apply: (target, name, wire) => { target[name] = wire || null; }
    },
    /** Per-ship projection (astra, phantom). Owned by ships/<id>/network.js and
     *  emitted under the RUNTIME name, so no consumer-side renaming exists. */
    projection: {
      read: (value, descriptor, pilot) =>
        window.NeonShips?.projectForNetwork?.(pilot) || {},
      apply: (target, name, wire, fallback, frame) => {
        target[name] = wire || null;
      }
    }
  });

  // scope: 'pilot'   -- always travels (movement, dash stats, loadout, ...)
  //        'identity'-- derived from the profile, not stored on the pilot
  //        'remote'  -- upgrade negotiation; only meaningful for a pilot the
  //                     host is negotiating with, so it is declared once here
  //                     instead of living in a second, divergent list
  const field = (name, kind, options = {}) => Object.freeze({
    name, kind, cap: options.cap, fallback: options.fallback,
    min: options.min, max: options.max, invalid: options.invalid,
    required: Boolean(options.required),
    scope: options.scope || 'pilot',
    // roster: also travels in the compact players[] list, which is a rendering
    // roster (position, ship, transient FX) and deliberately NOT a loadout dump.
    roster: Boolean(options.roster)
  });

  // ---------------------------------------------------------------------------
  // PILOT: ONE list, used for the host's own pilot and for every remote pilot.
  // The old split (23 host fields vs 68 guest fields) is exactly why the host's
  // warp ribbon and aegis never reached a guest.
  // ---------------------------------------------------------------------------
  const PILOT_FIELDS = Object.freeze([
    // Identity and vitals
    field('x', 'number', { required: true, roster: true }),
    field('y', 'number', { required: true, roster: true }),
    field('hp', 'number', { fallback: 100, min: 0, max: 100000, roster: true }),
    field('maxHp', 'number', { fallback: 100, min: 1, max: 100000, invalid: 100, roster: true }),
    field('aimAngle', 'number', { fallback: 0, min: -7, max: 7, roster: true }),
    field('radius', 'number', { fallback: 16, roster: true }),
    field('level', 'number', { fallback: 1, min: 1, max: 100000, invalid: 1, roster: true }),
    field('shipId', 'string', { fallback: 'riftblade', roster: true }),
    field('downed', 'boolean', { fallback: false, roster: true }),
    field('reviveIn', 'number', { fallback: 0, roster: true }),

    // Movement and dash. One canonical name per value on both sides.
    field('baseSpeed', 'number', { fallback: 240 }),
    field('dashCharges', 'number', { fallback: 3 }),
    field('maxDashCharges', 'number', { fallback: 3 }),
    field('dashRechargeTimer', 'number', { fallback: 0 }),
    field('dashRechargeTime', 'number', { fallback: 2.2 }),
    field('dashTimeLeft', 'number', { fallback: 0, roster: true }),
    field('invulnTimer', 'number', { fallback: 0, roster: true }),
    field('regen', 'number', { fallback: .8 }),
    field('crystals', 'number', { fallback: 0 }),
    field('cdrMultiplier', 'number', { fallback: 1 }),
    field('dmgMultiplier', 'number', { fallback: 1 }),
    field('areaMultiplier', 'number', { fallback: 1 }),

    // Derived dash and aegis stats. The guest used to hardcode these.
    field('dashSlashDmg', 'number', { fallback: 95 }),
    field('dashSlashWidth', 'number', { fallback: 18 }),
    field('dashCombo', 'number', { fallback: 0 }),
    field('hasAegis', 'boolean', { fallback: false }),
    field('aegisDuration', 'number', { fallback: 0 }),
    field('aegisRadius', 'number', { fallback: 0 }),
    field('aegisTimer', 'number', { fallback: 0 }),
    field('hasDashBlast', 'boolean', { fallback: false }),
    field('dashBlastRadius', 'number', { fallback: 0 }),
    field('hasFireTrail', 'boolean', { fallback: false }),
    field('fireTrailDuration', 'number', { fallback: 0 }),
    field('hasDashCryo', 'boolean', { fallback: false }),
    field('dashCryoDuration', 'number', { fallback: 0 }),

    // Transient visual effects: replicated, and overridden locally when this
    // pilot is the one being predicted.
    field('lastSlashFx', 'effect', { roster: true }),
    field('visualDash', 'number', { fallback: 0, roster: true }),

    // Loadout
    field('weapons', 'bag', { cap: 4 }), field('passives', 'bag', { cap: 4 }),
    field('dashUpgrades', 'bag', { cap: 10 }), field('limitBreaks', 'bag', { cap: 16 }),

    // Per-ship projection, under its runtime name.
    field('astra', 'projection', { roster: true }), field('phantom', 'projection', { roster: true }),

    // Identity, derived from the profile rather than stored on the pilot.
    field('name', 'string', { scope: 'identity', fallback: '队友' }),
    field('color', 'string', { scope: 'identity', fallback: '#90d6ff' }),

    // Upgrade negotiation: only meaningful for a remote pilot being negotiated
    // with, so it is declared once with an explicit scope instead of living in a
    // second, divergent list.
    field('lastSeq', 'number', { scope: 'remote', fallback: -1 }),
    field('pendingUpgrades', 'number', { scope: 'remote', fallback: 0 }),
    field('upgradeRound', 'number', { scope: 'remote', fallback: 0 }),
    field('upgradeCapacity', 'number', { scope: 'remote', fallback: 0 }),
    field('upgradeFinished', 'boolean', { scope: 'remote', fallback: true }),
    field('choices', 'ids', { scope: 'remote', cap: 5 }),
    field('pickedUpgradeIds', 'ids', { scope: 'remote', cap: 3 }),
    field('legendaryPityId', 'nullable', { scope: 'remote' })
  ]);

  // ---------------------------------------------------------------------------
  // ENTITY ARRAYS: fields, producer cap, validator cap and trim floor together,
  // so they cannot drift. The producer used to cap gems at 90 while the
  // validator required <= 90 -- zero margin. Raising the cap by one would have
  // made the validator reject EVERY snapshot, which looks exactly like the
  // "stuck on 正在同步房主战场" freeze.
  // ---------------------------------------------------------------------------
  // `trim` is the order layers are sacrificed in when a frame is over budget
  // (lower first); null means the layer is PROTECTED. This order used to live in
  // boundedSnapshot while the caps lived in snapshot(), which is how they
  // drifted.
  //
  // The ORDER IS A FAIRNESS DECISION, not a size one. It used to sacrifice
  // `gems`, then `bullets`, then `enemyBullets` before touching `enemies`, so a
  // crowded late game left a guest unable to see the enemy fire it has to dodge
  // -- it could not play, not merely watch a plainer screen. Decoration now goes
  // first, feedback next, threat after that, and the layer that decides whether
  // the guest survives is never sacrificed at all.
  // Enemies are deliberately NOT in this table: they are reduced by the
  // boss-preserving pass in boundedSnapshot, which drops the FARTHEST first
  // because the array arrives sorted by distance.
  const TRIM_DECORATION = 1; // particles, texts, shockwaves, trails, beams, mines...
  const TRIM_FEEDBACK = 11;  // gems, bullets: reward and muzzle feedback
  const array = (name, cap, safeCap, floor, trim, fields) => Object.freeze({
    name, cap, safeCap, floor, trim, fields: Object.freeze(fields)
  });

  const ENTITY_ARRAYS = Object.freeze([
    array('enemies', 105, 130, 0, null, ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'radius', 'color',
      'type', 'isBoss', 'isElite', 'hasShield', 'arming', 'aimTimer', 'coopCapture', 'coopExposed']),
    array('bullets', 120, 140, 60, TRIM_FEEDBACK + 1, ['x', 'y', 'vx', 'vy', 'radius', 'color',
      'type', 'isLevel5']),
    // No `damage`: the guest never resolves collisions, and the only consumer of
    // an enemy bullet on this side is renderEnemyBullets, which reads x/y/radius
    // /color. Carrying it cost ~1.3 KB on every frame of a late game.
    array('enemyBullets', 130, 150, 60, null, ['x', 'y', 'radius', 'color']),
    array('gems', 90, 120, 45, TRIM_FEEDBACK, ['x', 'y', 'radius', 'type', 'color', 'value']),
    array('shockwaves', 40, 60, 16, TRIM_DECORATION + 2, ['x', 'y', 'radius', 'color', 'alpha']),
    array('particles', 60, 90, 24, TRIM_DECORATION, ['type', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'radius', 'color', 'life', 'maxLife']),
    array('lightningTethers', 24, 40, 10, TRIM_DECORATION + 4, ['x1', 'y1', 'x2', 'y2']),
    array('blackHoles', 16, 24, 8, TRIM_DECORATION + 7, ['x', 'y', 'radius', 'rotAngle']),
    array('mines', 24, 36, 10, TRIM_DECORATION + 6, ['x', 'y', 'radius']),
    array('laserBeams', 24, 36, 10, TRIM_DECORATION + 5, ['x', 'y', 'angle', 'width', 'length']),
    array('companionDrones', 12, 20, 6, TRIM_DECORATION + 9, ['x', 'y', 'angle']),
    array('orbiters', 12, 20, 6, TRIM_DECORATION + 8, ['angle', 'distance', 'radius', 'color',
      'centerX', 'centerY']),
    array('dashTrails', 24, 36, 10, TRIM_DECORATION + 3, ['x1', 'y1', 'x2', 'y2', 'color', 'life',
      'maxLife']),
    array('texts', 40, 60, 12, TRIM_DECORATION + 1, ['x', 'y', 'text', 'color', 'size', 'life',
      'maxLife'])
  ]);

  // The fields that are NOT plain numbers. Declared once, by field name, because
  // `color` means the same thing in every layer. A field missing from this table
  // is a number, and the codec round-trip test fails loudly if that is ever wrong
  // for a newly added string field.
  const ENTITY_KINDS = Object.freeze({
    color: 'string', type: 'string', text: 'string',
    isBoss: 'boolean', isElite: 'boolean', hasShield: 'boolean',
    arming: 'boolean', isLevel5: 'boolean'
  });
  const kindOf = name => ENTITY_KINDS[name] || 'number';

  /** The arrays a frame carries, in wire order. */
  const ARRAY_NAMES = Object.freeze(ENTITY_ARRAYS.map(entry => entry.name));
  const BY_NAME = Object.freeze(Object.fromEntries(ENTITY_ARRAYS.map(entry => [entry.name, entry])));

  // ---------------------------------------------------------------------------
  // FRAME: the non-pilot envelope.
  // ---------------------------------------------------------------------------
  const FRAME_FIELDS = Object.freeze([
    'type', 'seq', 'round', 'time', 'level', 'kills', 'difficulty', 'mode',
    'teamXP', 'phase', 'rescue', 'resonance', 'host', 'guest', ...ARRAY_NAMES,
    'protocolVersion', 'players', 'localPlayerId', 'strings'
  ]);

  // --- readers ---------------------------------------------------------------

  const readField = (pilot, descriptor) => {
    const kind = KINDS[descriptor.kind];
    return kind.read(pilot?.[descriptor.name], descriptor, pilot);
  };

  /** One pilot block. `scope` selects which optional groups travel. */
  function readPilot(pilot, options = {}) {
    const scope = options.scope || 'remote';
    const identity = options.identity || { name: '队友', color: '#ffbb55' };
    const out = {};
    for (const descriptor of PILOT_FIELDS) {
      if (descriptor.scope === 'remote' && scope !== 'remote') continue;
      if (scope === 'roster' && descriptor.scope !== 'identity' && !descriptor.roster) continue;
      if (descriptor.scope === 'identity') {
        out[descriptor.name] = descriptor.name === 'name'
          ? String(identity.name || '队友').slice(0, 24)
          : String(identity.color || '#90d6ff').slice(0, 24);
        continue;
      }
      if (descriptor.kind === 'projection') {
        const projected = KINDS.projection.read(null, descriptor, pilot)[descriptor.name];
        if (projected) out[descriptor.name] = projected;
        continue;
      }
      const value = readField(pilot, descriptor);
      // Absent values are omitted rather than written as undefined, so the wire
      // stays as small as it is today.
      if (value !== undefined) out[descriptor.name] = value;
    }
    return out;
  }

  // --- entity codec ----------------------------------------------------------
  // WHY COLUMNS
  // A layer used to travel as one JSON object per entity, so every field name
  // was paid for by every entity: `"radius":13,` is 12 bytes, 105 times over.
  // It now travels as a struct of arrays -- the names appear once per layer:
  //
  //   enemies: { id: [...], x: [...], radius: [...], color: [...] }
  //
  // Measured on a world with every layer at its cap and every declared field
  // present: 80.6 KB -> 24.8 KB of layers. That is what stops the byte budget
  // from silently deleting whole layers, which is how a guest ended up unable to
  // see the enemy bullets it had to dodge.
  //
  // Strings are interned once per frame into `strings`, so 105 copies of
  // "#ff3300" become 105 copies of `0`. Worth 7.9 KB of that 21 KB on its own.
  // The table is bounded; anything too long or arriving after the table is full
  // travels verbatim, so interning can never lose information.
  const STRING_TABLE_CAP = 512;
  const STRING_MAX = 64;

  /** Intern one string, or return it verbatim when it does not fit. */
  function internString(value, strings) {
    if (value.length > STRING_MAX || strings.length >= STRING_TABLE_CAP) return value;
    const found = strings.indexOf(value);
    if (found >= 0) return found;
    strings.push(value);
    return strings.length - 1;
  }

  const toWire = (kind, value, strings) => {
    if (kind === 'string') return typeof value === 'string' ? internString(value, strings) : '';
    if (kind === 'boolean') return value ? 1 : 0;
    // Positions, velocities and timers travel as integer tenths -- the same
    // 0.1 precision the row encoding already rounded to, without the decimal
    // point. A non-finite value becomes 0 rather than the `null` JSON used to
    // write for Infinity.
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) : 0;
  };

  const fromWire = (kind, value, strings) => {
    if (kind === 'string') {
      if (typeof value === 'number') return strings[value] ?? '';
      return typeof value === 'string' ? value : '';
    }
    if (kind === 'boolean') return value === 1 || value === true;
    return typeof value === 'number' && Number.isFinite(value) ? value / 10 : 0;
  };

  /** One entity array as columns: capped, field-subset, id-stamped.
   *
   *  A column exists only when some entity carries the field, so a field that is
   *  absent everywhere still costs nothing. An entity missing a column decodes
   *  to 0 (or ''), which is indistinguishable from the absent field the row
   *  encoding used to omit: every consumer tests truthiness or a comparison.
   */
  function encodeEntities(rows, spec, strings) {
    const list = Array.isArray(rows) ? rows.slice(0, spec.cap) : [];
    const columns = spec.fields.filter(name => list.some(entity => entity?.[name] !== undefined));
    const layer = { id: [] };
    for (const name of columns) layer[name] = [];
    for (const entity of list) {
      layer.id.push(networkId(entity));
      for (const name of columns) {
        layer[name].push(toWire(kindOf(name), entity?.[name], strings));
      }
    }
    return layer;
  }

  /** Columns back into the row shape every consumer already reads. A layer that
   *  is already an array is passed through, so a hand-built frame still works. */
  function decodeEntities(layer, spec, strings) {
    if (Array.isArray(layer)) return layer;
    if (!layer || typeof layer !== 'object') return [];
    const ids = Array.isArray(layer.id) ? layer.id : [];
    const columns = spec.fields.filter(name => Array.isArray(layer[name]));
    return ids.map((id, index) => {
      const entity = { id: Number.isFinite(id) ? id : 0 };
      for (const name of columns) {
        entity[name] = fromWire(kindOf(name), layer[name][index], strings);
      }
      return entity;
    });
  }

  /** A whole frame: the envelope is copied through and every declared layer is
   *  transposed. Never mutates its input -- the sender still needs the row frame
   *  to decide what to trim. */
  function encodeFrame(rowFrame) {
    const strings = [];
    const wire = { ...rowFrame };
    for (const spec of ENTITY_ARRAYS) {
      wire[spec.name] = encodeEntities(rowFrame[spec.name], spec, strings);
    }
    wire.strings = strings;
    return wire;
  }

  /** The inverse. Called once, when a snapshot arrives, so that interpolation,
   *  the view, the boss lookup and the revive overlay all keep reading rows. */
  function decodeFrame(wireFrame) {
    if (!wireFrame || typeof wireFrame !== 'object') return wireFrame;
    const strings = Array.isArray(wireFrame.strings) ? wireFrame.strings : [];
    const frame = { ...wireFrame };
    for (const spec of ENTITY_ARRAYS) {
      frame[spec.name] = decodeEntities(wireFrame[spec.name], spec, strings);
    }
    delete frame.strings;
    return frame;
  }

  /** UTF-8 byte length. Written out rather than using TextEncoder/Blob because
   *  the budget has to mean the same thing in the browser and in the test
   *  sandboxes, which have no web globals. The old budget used String.length,
   *  which under-counts every Chinese glyph and emoji by 2-3x -- exactly the
   *  content of the `texts` layer. */
  function byteLength(text) {
    const value = typeof text === 'string' ? text : '';
    let bytes = 0;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length &&
        value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    }
    return bytes;
  }

  // --- appliers --------------------------------------------------------------

  /** Write one pilot block onto a replicated view object. */
  function applyPilot(target, wire, options = {}) {
    const scope = options.scope || 'remote';
    const source = wire || {};
    for (const descriptor of PILOT_FIELDS) {
      if (descriptor.scope === 'remote' && scope !== 'remote') continue;
      if (descriptor.scope === 'identity') continue;
      // Projections travel under their runtime name, so they are assigned
      // verbatim -- there is no translation layer to get out of step.
      KINDS[descriptor.kind].apply(target, descriptor.name, source[descriptor.name],
        descriptor.fallback, source);
    }
    return target;
  }

  function applyEntities(target, wire, name) {
    target[name] = Array.isArray(wire?.[name]) ? wire[name] : [];
  }

  const capOf = name => BY_NAME[name]?.cap ?? 0;
  const safeCapOf = name => BY_NAME[name]?.safeCap ?? 0;
  const floorOf = name => BY_NAME[name]?.floor ?? 0;
  const requiredPilotFields = () =>
    PILOT_FIELDS.filter(descriptor => descriptor.required).map(descriptor => descriptor.name);

  /** Bumped whenever a field is renamed or its meaning changes. A peer that
   *  announces a HIGHER version is refused rather than silently misread.
   *  4: entity layers travel as columns with a frame-level string table. */
  const VERSION = 4;
  /** Layers in sacrifice order; protected layers are excluded. */
  const TRIM_ORDER = Object.freeze(ENTITY_ARRAYS.filter(entry => entry.trim !== null)
    .sort((a, b) => a.trim - b.trim));

  window.NeonLanSchema = Object.freeze({
    VERSION, TRIM_ORDER,
    PILOT_FIELDS, ENTITY_ARRAYS, ARRAY_NAMES, FRAME_FIELDS, ENTITY_KINDS,
    STRING_TABLE_CAP, STRING_MAX,
    readPilot, encodeEntities, decodeEntities, encodeFrame, decodeFrame,
    applyPilot, applyEntities, byteLength,
    capOf, safeCapOf, floorOf, requiredPilotFields, readBag, networkId
  });
})();
