/* V6 groundwork: one stable registry of pilots in the authoritative world.
 * Existing game.player and lanCoop.ally remain references to their original
 * objects during the migration; registration never copies combat state.
 * No networking or gameplay logic lives in this module.
 */
(() => {
  'use strict';
  const MAX_PLAYERS = 4;
  const PLAYER_ID = /^[a-z][a-z0-9_-]{0,31}$/;
  const DEFAULT_SHIP = 'riftblade';

  function validId(id) {
    return typeof id === 'string' && PLAYER_ID.test(id);
  }

  function createRemotePilot(game, id = 'guest', shipId = DEFAULT_SHIP) {
    if (!['guest', 'guest-2', 'guest-3'].includes(id)) throw new Error('Invalid remote pilot ID');
    const spawn = id === 'guest' ? { x:60,y:0 } :
      id === 'guest-2' ? { x:-60,y:0 } : { x:0,y:60 };
    const ship = window.NeonShips?.startingState(shipId) || {
      shipId: DEFAULT_SHIP, hp: 100, maxHp: 100,
      baseSpeed: 240, regen: .8, dashCharges: 3,
      weapons: { blaster: 1 }, passives: {}
    };
    return {
      id, playerId: id, shipId: ship.shipId,
      x: (game?.player?.x || 0) + spawn.x,
      y: (game?.player?.y || 0) + spawn.y,
      vx: 0, vy: 0, hp: ship.hp, maxHp: ship.maxHp, baseSpeed: ship.baseSpeed,
      regen: ship.regen, level: 1, radius: 16,
      xp: 0, xpNeeded: game?.player?.xpNeeded || 1,
      aimAngle: 0, invuln: 0, dash: 0, charges: ship.dashCharges,
      recharge: 0, maxCharges: ship.dashCharges,
      pendingUpgrades: 0, choices: [], legendaryPityId: null,
      pickedUpgradeIds: [], upgradeCapacity: 0, upgradeFinished: true,
      upgradeRound: 0,
      weapons: { ...ship.weapons }, passives: { ...ship.passives },
      dashUpgrades: {}, limitBreaks: {}, timers: {},
      dmgMultiplier: 1, areaMultiplier: 1, extraProjectiles: 0,
      cdrMultiplier: 1, critRate: .08, critDmg: 1.5,
      shotTime: 0, lastSeq: -1, lastInputAt: 0,
      input: { dx: 0, dy: 0, aim: 0, dash: false },
      profile: window.NeonLanTeammates?.normalizeProfile(null, 'guest') || {
        name: id === 'guest' ? '队友' : `队友${id.split('-')[1]}`,
        color: '#ffbb55', colorId: 'auto'
      }
    };
  }

  class PlayerRegistry {
    constructor() {
      this.entries = new Map();
    }

    get size() { return this.entries.size; }

    get(id) { return validId(id) ? this.entries.get(id) || null : null; }

    has(id) { return this.get(id) !== null; }

    register(id, state) {
      if (!validId(id)) throw new Error('Invalid player ID');
      if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new Error('Invalid player state');
      }
      if (this.entries.has(id)) throw new Error('Player already registered');
      if (this.size >= MAX_PLAYERS) throw new Error('Player registry is full');
      this.entries.set(id, state);
      return state;
    }

    // Replacement is explicit, preventing network join from silently
    // overwriting another pilot's HP, inventory or selected ship.
    replace(id, state) {
      if (!this.has(id)) throw new Error('Unknown player');
      if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new Error('Invalid player state');
      }
      this.entries.set(id, state);
      return state;
    }

    remove(id) { return validId(id) && this.entries.delete(id); }

    list() {
      return [...this.entries].map(([id, state]) => Object.freeze({ id, state }));
    }

    // Immutable projection for UI/telemetry. Never transmit the whole state
    // (weapons/timers/sets/inputs) without an explicit network schema.
    project() {
      return Object.freeze(this.list().map(({ id, state }) => Object.freeze({
        id, shipId: state.shipId || DEFAULT_SHIP,
        x: state.x || 0, y: state.y || 0,
        hp: state.hp || 0, maxHp: state.maxHp || 0,
        level: state.level || 1, downed: Boolean(state.downed)
      })));
    }
  }

  window.NeonPlayers = Object.freeze({
    MAX_PLAYERS, DEFAULT_SHIP, validId, createRemotePilot, PlayerRegistry
  });
})();
