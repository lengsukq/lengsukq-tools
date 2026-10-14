/* Protocol v2 pilot serialization. Legacy host/guest fields are preserved by
 * the current dual-player sender until all clients migrate to players[].
 * Only explicit primitive fields cross the network, never live state objects.
 */
(() => {
  'use strict';
  const MAX_PLAYERS = 4;
  const clamp = (value, min, max, fallback = 0) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const SHIP_ID = /^[a-z][a-z0-9_]{0,31}$/;
  /** One roster entry. Uses the SAME contract as the host/guest blocks, so a
   *  field can no longer exist on one side of the wire and not the other. */
  function serializePilot(id, state) {
    if (!window.NeonPlayers?.validId?.(id) || !state || typeof state !== 'object') return null;
    const block = window.NeonLanSchema.readPilot(state, {
      scope: 'roster',
      identity: {
        name: state.profile?.name || (id === 'host' ? '房主' : id),
        color: state.profile?.color || '#90d6ff'
      }
    });
    return Object.freeze({
      id,
      ...block,
      shipId: SHIP_ID.test(state.shipId || '') ? state.shipId : 'riftblade'
    });
  }
  function players(game) {
    const registry = game?.players;
    const existing = registry?.list?.() || [
      game?.player && { id: 'host', state: game.player },
      game?.lanCoop?.ally && { id: 'guest', state: game.lanCoop.ally }
    ].filter(Boolean);
    return Object.freeze(existing.slice(0, MAX_PLAYERS)
      .map(({ id, state }) => serializePilot(id, state))
      .filter(Boolean));
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
    frame.protocolVersion = window.NeonLanSchema.VERSION;
    frame.players = pilots;
    frame.localPlayerId = receiverId;
    return frame;
  }
  window.NeonLanSnapshots = Object.freeze({
    MAX_PLAYERS, serializePilot, players, decorate
  });
})();
