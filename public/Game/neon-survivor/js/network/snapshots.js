/* Protocol v2 pilot serialization. Legacy host/guest fields are preserved by
 * the current dual-player sender until all clients migrate to players[].
 * Only explicit primitive fields cross the network, never live state objects.
 */
(() => {
  'use strict';
  const VERSION = 2;
  const MAX_PLAYERS = 4;
  const clamp = (value, min, max, fallback = 0) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  function arcaneView(pilot) {
    // Legacy accessor remains for callers of V2 arcane snapshots; new class
    // serializers live in their own ships/<id>/network.js modules.
    return window.NeonShips?.projectForNetwork?.(pilot)?.arcane || null;
  }
  function serializePilot(id, state) {
    if (!window.NeonPlayers?.validId?.(id) || !state || typeof state !== 'object') return null;
    const shipId = typeof state.shipId === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(state.shipId)
      ? state.shipId : 'riftblade';
    return Object.freeze({
      id, shipId,
      x: clamp(state.x, -1e7, 1e7), y: clamp(state.y, -1e7, 1e7),
      aimAngle: clamp(state.aimAngle, -7, 7),
      hp: clamp(state.hp, 0, 100000), maxHp: clamp(state.maxHp, 1, 100000, 100),
      level: Math.floor(clamp(state.level, 1, 100000, 1)),
      downed: Boolean(state.downed),
      ...(window.NeonShips?.projectForNetwork?.(state) || {})
    });
  }
  function players(game) {
    const registry = game?.players;
    const existing = registry?.list?.() || [
      game?.player && { id: 'host', state: game.player },
      game?.lanCoop?.ally && { id: 'guest', state: game.lanCoop.ally }
    ].filter(Boolean);
    return Object.freeze(existing.slice(0, MAX_PLAYERS)
      .map(({ id, state }) => {
        const pilot = serializePilot(id, state);
        if (!pilot) return null;
        return Object.freeze({ ...pilot,
          name: String(state?.profile?.name || (id === 'host' ? '房主' : id)).slice(0, 24),
          color: typeof state?.profile?.color === 'string' ?
            state.profile.color.slice(0, 24) : '#90d6ff' });
      }).filter(Boolean));
  }
  function decorate(frame, game, receiverId = 'guest') {
    if (!frame || typeof frame !== 'object' || !window.NeonPlayers?.validId?.(receiverId)) {
      throw new Error('Invalid multiplayer snapshot');
    }
    const pilots = players(game);
    if (!pilots.some(pilot => pilot.id === receiverId)) {
      // Before guest handshake or during a disconnected lobby, do not invent
      // identities in client snapshots.
      return frame;
    }
    frame.protocolVersion = VERSION;
    frame.players = pilots;
    frame.localPlayerId = receiverId;
    return frame;
  }
  window.NeonLanSnapshots = Object.freeze({
    VERSION, MAX_PLAYERS, arcaneView, serializePilot, players, decorate
  });
})();
