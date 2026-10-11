/* Connection-scoped transport for a 2–4 player host-star room.
 * Each peerId owns its channels and status; sender identity is supplied by
 * the bound connection, never by a client-controlled JSON field.
 */
(() => {
  'use strict';
  const LIMIT = 40000;
  const BACKPRESSURE = 100000;
  const REALTIME_TYPES = new Set(['input', 'snapshot']);
  class PeerDirectory {
    constructor() { this.connections = new Map(); }
    get size() { return this.connections.size; }
    get(id) { return this.connections.get(id) || null; }
    attach(id, channel) {
      if (!window.NeonPlayers?.validId?.(id) || !channel) throw new Error('Invalid peer');
      const connection = this.connections.get(id) || { id, control: null, realtime: null };
      if (channel.label === 'neon-realtime' || channel.name === 'neon-realtime') {
        connection.realtime = channel;
      } else if (channel.label === 'neon-game' || channel.name === 'neon-game') {
        connection.control = channel;
      } else throw new Error('Unsupported data channel');
      this.connections.set(id, connection);
      return connection;
    }
    remove(id) { return this.connections.delete(id); }
    clear() { this.connections.clear(); }
    sendTo(id, payload) {
      const peer = this.get(id);
      if (!peer || !payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
      const channel = REALTIME_TYPES.has(payload.type) && peer.realtime?.readyState === 'open'
        ? peer.realtime : peer.control;
      if (!channel || channel.readyState !== 'open' || channel.bufferedAmount > BACKPRESSURE) return false;
      const encoded = JSON.stringify(payload);
      if (!encoded || encoded.length > LIMIT) return false;
      channel.send(encoded);
      return true;
    }
    broadcast(payloadFor, excludeId = null) {
      const delivered = [];
      for (const id of this.connections.keys()) {
        if (id === excludeId) continue;
        const payload = typeof payloadFor === 'function' ? payloadFor(id) : payloadFor;
        if (this.sendTo(id, payload)) delivered.push(id);
      }
      return delivered;
    }
    receive(id, encoded, onData) {
      if (!this.connections.has(id) || typeof encoded !== 'string' || encoded.length > LIMIT ||
          typeof onData !== 'function') return false;
      try {
        const packet = JSON.parse(encoded);
        if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return false;
        onData(packet, id); // authoritative identity from the channel mapping
        return true;
      } catch { return false; }
    }
  }
  window.NeonLanPeers = Object.freeze({ PeerDirectory, LIMIT, BACKPRESSURE });
})();
