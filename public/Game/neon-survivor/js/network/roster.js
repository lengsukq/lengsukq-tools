/* V6 room membership, independent of WebRTC, signaling and rendering.
 * One host + 1–3 guests. A room's capacity is fixed at creation (2/3/4).
 * 'Reserved' participants occupy slots until they leave or are evicted;
 * transient connection loss does not silently give their seat to a stranger.
 */
(() => {
  'use strict';
  const ROOM_SIZES = Object.freeze([2, 3, 4]);
  const ID = /^(?:host|guest(?:-[2-3])?)$/;
  const STATES = Object.freeze(['reserved', 'connected', 'disconnected']);

  function validCapacity(capacity) { return ROOM_SIZES.includes(capacity); }
  function validId(id) { return typeof id === 'string' && ID.test(id); }

  class RoomRoster {
    constructor(capacity = 2) {
      if (!validCapacity(capacity)) throw new Error('Room size must be 2, 3 or 4');
      this.capacity = capacity;
      this.members = new Map([['host', { id: 'host', status: 'connected' }]]);
    }
    get size() { return this.members.size; }
    get guests() { return this.members.size - 1; }
    get full() { return this.size >= this.capacity; }
    has(id) { return validId(id) && this.members.has(id); }
    get(id) {
      const member = this.has(id) ? this.members.get(id) : null;
      return member ? Object.freeze({ ...member }) : null;
    }
    reserve(id = null) {
      if (this.full) throw new Error('Room is full');
      const next = id || ['guest', 'guest-2', 'guest-3'].find(candidate => !this.has(candidate));
      if (!validId(next) || next === 'host') throw new Error('Invalid guest ID');
      if (this.has(next)) throw new Error('Player already in room');
      this.members.set(next, { id: next, status: 'reserved' });
      return next;
    }
    setStatus(id, status) {
      if (!this.has(id) || !STATES.includes(status)) throw new Error('Invalid member status');
      if (id === 'host' && status === 'reserved') throw new Error('Host cannot be reserved');
      this.members.get(id).status = status;
      return this.get(id);
    }
    remove(id) {
      if (id === 'host') throw new Error('Host cannot leave its own room');
      return validId(id) && this.members.delete(id);
    }
    list() {
      return Object.freeze([...this.members.values()].map(member => Object.freeze({ ...member })));
    }
    // Ordinary membership only: tokens, SDP, input and player state are never
    // stored in a roster or sent to other participants through this view.
    snapshot() {
      return Object.freeze({ capacity: this.capacity, members: this.list() });
    }
  }

  window.NeonLanRoster = Object.freeze({ ROOM_SIZES, validCapacity, validId, RoomRoster });
})();
