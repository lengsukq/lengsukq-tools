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
  // `trim` is the order decorative layers are sacrificed in when a frame is
  // over budget (lower first); null means the layer is PROTECTED and is only
  // ever reduced by the boss-preserving enemy pass. This order used to live in
  // boundedSnapshot while the caps lived in snapshot(), which is how they drifted.
  const array = (name, cap, safeCap, floor, trim, fields) => Object.freeze({
    name, cap, safeCap, floor, trim, fields: Object.freeze(fields)
  });

  const ENTITY_ARRAYS = Object.freeze([
    array('enemies', 105, 130, 0, null, ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'radius', 'color',
      'type', 'isBoss', 'isElite', 'hasShield', 'arming', 'aimTimer', 'coopCapture', 'coopExposed']),
    array('bullets', 120, 140, 60, 12, ['x', 'y', 'vx', 'vy', 'radius', 'color', 'type', 'isLevel5']),
    array('enemyBullets', 130, 150, 60, 13, ['x', 'y', 'radius', 'color', 'damage']),
    array('gems', 90, 120, 45, 11, ['x', 'y', 'radius', 'type', 'color', 'value']),
    array('shockwaves', 40, 60, 16, 3, ['x', 'y', 'radius', 'color', 'alpha']),
    array('particles', 60, 90, 24, 1, ['type', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'radius',
      'color', 'life', 'maxLife']),
    array('lightningTethers', 24, 40, 10, 9, ['x1', 'y1', 'x2', 'y2']),
    array('blackHoles', 16, 24, 8, 8, ['x', 'y', 'radius', 'rotAngle']),
    array('mines', 24, 36, 10, 7, ['x', 'y', 'radius']),
    array('laserBeams', 24, 36, 10, 6, ['x', 'y', 'angle', 'width', 'length']),
    // Drones and orbiters carry up to 5 synthesised entries for the guest's own
    // weapons, appended after the cap, so their safe cap is cap + 5.
    array('companionDrones', 12, 20, 6, 5, ['x', 'y', 'angle']),
    array('orbiters', 12, 20, 6, 10, ['angle', 'distance', 'radius', 'color']),
    array('dashTrails', 24, 36, 10, 4, ['x1', 'y1', 'x2', 'y2', 'color', 'life', 'maxLife']),
    array('texts', 40, 60, 12, 2, ['x', 'y', 'text', 'color', 'size', 'life', 'maxLife'])
  ]);

  /** The arrays a frame carries, in wire order. */
  const ARRAY_NAMES = Object.freeze(ENTITY_ARRAYS.map(entry => entry.name));
  const BY_NAME = Object.freeze(Object.fromEntries(ENTITY_ARRAYS.map(entry => [entry.name, entry])));

  // ---------------------------------------------------------------------------
  // FRAME: the non-pilot envelope.
  // ---------------------------------------------------------------------------
  const FRAME_FIELDS = Object.freeze([
    'type', 'seq', 'round', 'time', 'level', 'kills', 'difficulty', 'mode',
    'teamXP', 'phase', 'rescue', 'resonance', 'host', 'guest', ...ARRAY_NAMES,
    'protocolVersion', 'players', 'localPlayerId'
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

  /** One entity array: capped, field-subset, id-stamped. */
  function readEntities(list, spec) {
    return (list || []).slice(0, spec.cap).map(entity => {
      const out = { id: networkId(entity) };
      for (const name of spec.fields) {
        const value = entity?.[name];
        if (typeof value === 'number') out[name] = round(value);
        else if (typeof value === 'string' || typeof value === 'boolean') out[name] = value;
      }
      return out;
    });
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
   *  announces a HIGHER version is refused rather than silently misread. */
  const VERSION = 3;
  /** Decorative layers in sacrifice order; protected layers are excluded. */
  const TRIM_ORDER = Object.freeze(ENTITY_ARRAYS.filter(entry => entry.trim !== null)
    .sort((a, b) => a.trim - b.trim));

  window.NeonLanSchema = Object.freeze({
    VERSION, TRIM_ORDER,
    PILOT_FIELDS, ENTITY_ARRAYS, ARRAY_NAMES, FRAME_FIELDS,
    readPilot, readEntities, applyPilot, applyEntities,
    capOf, safeCapOf, floorOf, requiredPilotFields, readBag, networkId
  });
})();
