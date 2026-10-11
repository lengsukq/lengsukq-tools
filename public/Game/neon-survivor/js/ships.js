/* V6 ship registry: data, slot limits, class abilities and rendering plugins.
 * Class-specific mechanics are registered independently of the combat core.
 */
(() => {
  'use strict';
  const DEFAULT_SHIP_ID = 'riftblade';
  // Content-driven registration: four initial ships are a design milestone,
  // not a hard upper bound that requires editing the engine for ship #5.
  const VALID_ID = /^[a-z][a-z0-9_]{0,31}$/;
  const ships = new Map();
  const renderers = new Map();
  const abilities = new Map();
  const upgradeCatalogs = new Map();
  const visualEffects = new Map();
  const networkProjections = new Map();
  const HOOKS = Object.freeze(['onStart', 'onTick', 'onAction', 'onUpgrade', 'onStop']);
  const DEFAULT_SLOTS = Object.freeze({ weapons: 4, passives: 4, warp: 7 });

  function register(definition) {
    if (!definition || !VALID_ID.test(definition.id || '') ||
        !VALID_ID.test(definition.rendererId || '') ||
        !VALID_ID.test(definition.warpTreeId || '') ||
        typeof definition.name !== 'string' || !definition.name.trim() ||
        !VALID_ID.test(definition.startingWeapon || '')) {
      throw new Error('Invalid ship definition');
    }
    if (ships.has(definition.id)) throw new Error('Ship already registered');
    const stats = definition.baseStats || {};
    for (const key of ['hp', 'speed', 'regen', 'dashCharges']) {
      if (!Number.isFinite(stats[key]) || stats[key] < 0 ||
          (key !== 'regen' && stats[key] <= 0)) throw new Error('Invalid ship stats');
    }
    if (!Array.isArray(definition.activeSkillIds) ||
        !definition.activeSkillIds.every(id => VALID_ID.test(id))) {
      throw new Error('Invalid active skills');
    }
    const requestedSlots = definition.slots === undefined ? {} : definition.slots;
    if (!requestedSlots || typeof requestedSlots !== 'object' || Array.isArray(requestedSlots) ||
        Object.keys(requestedSlots).some(key =>
          !['weapons','passives','warp','activeSkills'].includes(key))) {
      throw new Error('Invalid ship slots');
    }
    const slots = { ...DEFAULT_SLOTS, ...requestedSlots };
    for (const key of ['weapons','passives','warp']) {
      if (!Number.isSafeInteger(slots[key]) || slots[key] < (key === 'weapons' ? 1 : 0) ||
          slots[key] > 16) throw new Error('Invalid ship slots');
    }
    if (slots.activeSkills !== undefined &&
        slots.activeSkills !== definition.activeSkillIds.length) {
      throw new Error('Invalid ship active skill slots');
    }
    slots.activeSkills = definition.activeSkillIds.length;
    if (definition.passiveId && slots.passives < 1) throw new Error('Invalid ship slots');
    const entry = Object.freeze({
      id: definition.id,
      code: definition.code || definition.id.toUpperCase(),
      name: definition.name.trim(),
      description: definition.description || '',
      playable: definition.playable === true,
      baseStats: Object.freeze({ hp: stats.hp, speed: stats.speed,
        regen: stats.regen, dashCharges: stats.dashCharges }),
      slots: Object.freeze(slots),
      startingWeapon: definition.startingWeapon,
      passiveId: definition.passiveId || null,
      activeSkillIds: Object.freeze([...definition.activeSkillIds]),
      warpTreeId: definition.warpTreeId,
      rendererId: definition.rendererId
    });
    ships.set(entry.id, entry);
    return entry;
  }
  // Room difficulty modifies effective capacity without modifying a ship
  // definition. Ascension V+ removes exactly one passive slot, as before.
  function slotLimitsFor(pilot, difficulty = 0) {
    const ship = resolve(typeof pilot === 'string' ? pilot : pilot?.shipId);
    const base = ship.slots;
    return Object.freeze({
      weapons: base.weapons,
      passives: Math.max(0, base.passives -
        (Number.isFinite(difficulty) && difficulty >= 5 ? 1 : 0)),
      warp: base.warp,
      activeSkills: base.activeSkills
    });
  }
  // One authoritative rule for solo drafts, host-side remote validation and
  // slot-aware UI. Upgrading an equipped item never consumes another slot.
  function canEquipUpgrade(pilot, card, difficulty = 0) {
    if (!pilot || !card || !VALID_ID.test(card.id || '') ||
        !Number.isSafeInteger(card.maxLvl) || card.maxLvl < 1) return false;
    const field = { weapon: 'weapons', passive: 'passives', dash: 'dashUpgrades' }[card.type];
    if (!field) return false;
    const bag = pilot[field] || {};
    const current = bag[card.id] || 0;
    if (!Number.isSafeInteger(current) || current < 0 || current >= card.maxLvl) return false;
    if (current > 0) return true;
    const limits = slotLimitsFor(pilot, difficulty);
    const category = card.type === 'dash' ? 'warp' : field;
    return Object.keys(bag).length < limits[category];
  }

  function get(id) { return ships.get(id) || null; }
  function list(playableOnly = true) {
    return Object.freeze([...ships.values()].filter(ship => !playableOnly || ship.playable));
  }
  function resolve(id) {
    const requested = get(id);
    return requested?.playable ? requested : ships.get(DEFAULT_SHIP_ID);
  }
  function startingState(id = DEFAULT_SHIP_ID) {
    const ship = resolve(id);
    return {
      shipId: ship.id,
      hp: ship.baseStats.hp, maxHp: ship.baseStats.hp,
      baseSpeed: ship.baseStats.speed, regen: ship.baseStats.regen,
      dashCharges: ship.baseStats.dashCharges,
      weapons: { [ship.startingWeapon]: 1 },
      passives: ship.passiveId ? { [ship.passiveId]: 1 } : {}
    };
  }
  function registerRenderer(id, draw) {
    if (!VALID_ID.test(id || '') || typeof draw !== 'function') {
      throw new Error('Invalid ship renderer');
    }
    if (renderers.has(id)) throw new Error('Renderer already registered');
    renderers.set(id, draw);
  }
  // Optional class-specific visuals live with the class rather than in core.
  // World effects are rendered once per present ship type; local effects are
  // rendered for each pilot. Both receive the unmodified drawing context.
  function registerEffects(id, hooks) {
    if (!ships.has(id)) throw new Error('Unknown ship');
    if (visualEffects.has(id)) throw new Error('Ship effects already registered');
    if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks) ||
        Object.keys(hooks).some(key => !['pilot','world','network'].includes(key) ||
          typeof hooks[key] !== 'function')) throw new Error('Invalid ship effects');
    visualEffects.set(id, Object.freeze({ ...hooks }));
  }
  function drawPilotEffects(ctx, pilot, game) {
    const draw = visualEffects.get(pilot?.shipId)?.pilot;
    if (!draw) return false;
    draw(ctx, pilot, game);
    return true;
  }
  function drawNetworkEffects(ctx, snapshotPilot, game) {
    const draw = visualEffects.get(snapshotPilot?.shipId)?.network;
    if (!draw) return false;
    draw(ctx, snapshotPilot, game);
    return true;
  }
  function registerNetworkProjection(id, serialize) {
    if (!ships.has(id)) throw new Error('Unknown ship');
    if (networkProjections.has(id)) throw new Error('Ship projection already registered');
    if (typeof serialize !== 'function') throw new Error('Invalid ship projection');
    networkProjections.set(id, serialize);
  }
  function projectForNetwork(pilot) {
    const serializer = networkProjections.get(pilot?.shipId);
    if (!serializer) return null;
    const extra = serializer(pilot);
    if (!extra || typeof extra !== 'object' || Array.isArray(extra) ||
        Object.keys(extra).some(key => ['id','shipId','x','y','hp','maxHp','level','downed','aimAngle'].includes(key))) {
      throw new Error('Invalid ship network projection');
    }
    // Prevent ship-specific state from silently expanding realtime packets.
    const serialized = JSON.stringify(extra);
    if (!serialized || serialized.length > 4096) throw new Error('Ship projection too large');
    return extra;
  }
  function drawWorldEffects(ctx, game) {
    const states = game?.players?.list?.().map(({ state }) => state) ||
      [game?.player, game?.lanCoop?.ally].filter(Boolean);
    const rendered = new Set();
    for (const pilot of states) {
      const id = pilot?.shipId;
      if (rendered.has(id) || !visualEffects.get(id)?.world) continue;
      rendered.add(id);
      visualEffects.get(id).world(ctx, game);
    }
    return rendered.size;
  }
  function registerAbilities(id, handlers) {
    if (!ships.has(id)) throw new Error('Unknown ship');
    if (abilities.has(id)) throw new Error('Ship abilities already registered');
    if (!handlers || typeof handlers !== 'object' || Array.isArray(handlers) ||
        Object.keys(handlers).some(key => !HOOKS.includes(key) || typeof handlers[key] !== 'function')) {
      throw new Error('Invalid ship abilities');
    }
    abilities.set(id, Object.freeze({ ...handlers }));
  }
  function registerUpgradeCatalog(id, definitions) {
    if (!ships.has(id)) throw new Error('Unknown ship');
    if (upgradeCatalogs.has(id)) throw new Error('Ship upgrade catalog already registered');
    if (!Array.isArray(definitions) || !definitions.length) throw new Error('Invalid upgrade catalog');
    const seen = new Set();
    const cards = definitions.map(card => {
      if (!card || !VALID_ID.test(card.id || '') || seen.has(card.id) ||
          !['weapon','passive','dash'].includes(card.type) ||
          !['common','rare','legendary'].includes(card.rarity) ||
          !Number.isSafeInteger(card.maxLvl) || card.maxLvl < 1 || card.maxLvl > 20) {
        throw new Error('Invalid ship upgrade card');
      }
      seen.add(card.id);
      return Object.freeze({ ...card, shipId: id });
    });
    upgradeCatalogs.set(id, Object.freeze(cards));
  }
  function upgradeCatalogFor(pilot) {
    const ship = ships.get(pilot?.shipId);
    return ship?.playable ? upgradeCatalogs.get(ship.id) || null : null;
  }
  function runAbility(pilot, hook, ...args) {
    const ship = ships.get(pilot?.shipId);
    if (!ship?.playable || !HOOKS.includes(hook)) return undefined;
    return abilities.get(ship.id)?.[hook]?.(pilot, ...args);
  }
  // The caller has already translated/rotated the canvas to ship coordinates.
  function drawHull(ctx, fighter, profile) {
    const ship = resolve(fighter?.shipId);
    const draw = renderers.get(ship.rendererId);
    if (!draw) return false;
    draw(ctx, fighter, profile);
    return true;
  }

  window.NeonShips = Object.freeze({
    DEFAULT_SHIP_ID, register, get, list, resolve,
    startingState, slotLimitsFor, canEquipUpgrade, registerRenderer, registerEffects,
    drawPilotEffects, drawNetworkEffects, drawWorldEffects,
    registerNetworkProjection, projectForNetwork, registerAbilities, runAbility,
    registerUpgradeCatalog, upgradeCatalogFor, drawHull
  });
})();
