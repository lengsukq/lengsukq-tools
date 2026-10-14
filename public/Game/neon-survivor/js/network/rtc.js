/* LAN-only, server-free WebRTC transport.
 * BroadcastChannel discovery is SAME ORIGIN / SAME BROWSER PROFILE only.
 * Cross-device pairing uses manual ICE-complete offer/answer exchange.
 * Browsers do not provide a general LAN browser-room discovery API.
 */
(() => {
  'use strict';
  const VERSION = 1;
  const CHANNEL_NAME = 'neon-survivor-lan-v1';
  const roomPattern = /^[A-Z0-9]{6}$/;
  const LIMIT = 12000;
  function safeText(value) { return String(value || '').slice(0, 80); }
  function roomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, n => chars[n % chars.length]).join('');
  }
  function parseSignal(text) {
    if (typeof text !== 'string' || text.length > LIMIT) throw Error('连接信息无效或过长');
    let data;
    try { data = JSON.parse(text.trim()); } catch { throw Error('连接信息不是有效 JSON'); }
    if (!data || data.version !== VERSION || !roomPattern.test(data.room) ||
      !['offer', 'answer'].includes(data.kind) || !data.description ||
      data.description.type !== data.kind ||
      typeof data.description.sdp !== 'string' || data.description.sdp.length > LIMIT - 300) {
      throw Error('连接信息格式或版本不正确');
    }
    return data;
  }
  async function completeIce(pc, timeoutMs = 10000) {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(Error('候选地址收集超时，请重试')); }, timeoutMs);
      function cleanup() { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); }
      function check() { if (pc.iceGatheringState === 'complete') { cleanup(); resolve(); } }
      pc.addEventListener('icegatheringstatechange', check);
      check();
    });
  }
  class LanRTC {
    constructor(onStatus = () => {}, onData = () => {}) {
      this.onStatus = onStatus;
      this.onData = onData;
      this.role = null;
      this.room = null;
      this.peer = null;
      this.channel = null;
      this.realtimeChannel = null;
      this.connected = false;
      this.capacity = 2;
      this.localPlayerId = 'guest';
      this.peerLinks = new Map();
      this.clientId = roomCode();
      this.peers = window.NeonLanPeers ? new window.NeonLanPeers.PeerDirectory() : null;
      this.roster = null;
      this.rooms = new Map();
      this.broadcast = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
      if (this.broadcast) this.broadcast.onmessage = e => this.handleBroadcast(e.data);
    }
    status(text) { this.onStatus(safeText(text)); }
    host(capacity = 2) {
      this.closePeer();
      this.role = 'host';
      this.room = roomCode();
      this.capacity = [2, 3, 4].includes(capacity) ? capacity : 2;
      this.roster = window.NeonLanRoster ?
        new window.NeonLanRoster.RoomRoster(this.capacity) : null;
      this.announce();
      this.status('已创建房间 ' + this.room + '。请生成邀请信息或等待同浏览器加入。');
      return this.room;
    }
    discover() {
      this.rooms.clear();
      this.broadcast?.postMessage({ type: 'discover', from: this.clientId });
      return this.rooms;
    }
    announce() {
      if (this.role === 'host' && this.room) {
        this.broadcast?.postMessage({ type: 'announce', from: this.clientId, room: this.room });
      }
    }
    handleBroadcast(msg) {
      if (!msg || msg.from === this.clientId || typeof msg !== 'object') return;
      if (msg.type === 'discover') this.announce();
      if (msg.type === 'announce' && roomPattern.test(msg.room) && !this.connected) {
        this.rooms.set(msg.room, { room: msg.room, from: msg.from });
        this.onRooms?.(Array.from(this.rooms.values()));
      }
      if (msg.to !== this.clientId) return;
      if (msg.type === 'join' && this.role === 'host' && msg.room === this.room) {
        if (this.peerLinks.size >= this.capacity - 1) {
          this.status('当前房间的配对座位已满');
          return;
        }
        const nextId = ['guest','guest-2','guest-3'].find(id => !this.peerLinks.has(id));
        this.makeOffer(nextId).then(offer => this.broadcast?.postMessage({
          type: 'offer', from: this.clientId, to: msg.from, offer
        })).catch(error => this.status('自动连接失败：' + error.message));
      }
      if (msg.type === 'offer' && this.role === 'guest') {
        this.acceptOffer(msg.offer).then(answer => this.broadcast?.postMessage({
          type: 'answer', from: this.clientId, to: msg.from, answer
        })).catch(error => this.status('自动连接失败：' + error.message));
      }
      if (msg.type === 'answer' && this.role === 'host') {
        let seat = 'guest';
        try { seat = JSON.parse(msg.answer)?.playerId || 'guest'; } catch { /* invalid signal */ }
        this.acceptAnswer(msg.answer, seat).catch(error => this.status(error.message));
      }
    }
    joinDiscovered(room, hostId) {
      if (!roomPattern.test(room) || !hostId || !this.broadcast) throw Error('房间信息无效');
      this.closePeer();
      this.role = 'guest';
      this.room = room;
      this.broadcast.postMessage({ type: 'join', room, from: this.clientId, to: hostId });
      this.status('正在连接同浏览器房间 ' + room);
    }
    makePeer(host, playerId = 'guest') {
      if (typeof RTCPeerConnection === 'undefined') throw Error('该浏览器不支持 WebRTC');
      if (!host) this.closePeer();
      else if (this.peerLinks.has(playerId)) throw Error('该座位已创建连接');
      const pc = new RTCPeerConnection({ iceServers: [] }); // no STUN or TURN
      if (host) this.peerLinks.set(playerId, { pc, control: null, realtime: null });
      if (!host || playerId === 'guest') this.peer = pc;
      pc.onconnectionstatechange = () => {
        if (host ? this.peerLinks.get(playerId)?.pc !== pc : this.peer !== pc) return;
        const online = pc.connectionState === 'connected';
        // DataChannel is the actual game transport. ICE/PC can become
        // connected before the control channel opens; don't mount the room
        // staging UI prematurely in that state.
        const control = host ? this.peerLinks.get(playerId)?.control : this.channel;
        if (online && control?.readyState !== 'open') return;
        this.connected = host ? [...this.peerLinks.values()].some(p =>
          p.control?.readyState === 'open') : online;
        this.onConnection?.(online, host ? playerId : this.localPlayerId);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          this.status('连接断开，请重新配对');
        }
      };
      if (host) {
        this.bindChannel(pc.createDataChannel('neon-game'), playerId);
        // Frequent positions need latest-state delivery, not retransmissions of
        // stale snapshots. Upgrades/profile remain on reliable neon-game.
        try {
          this.bindChannel(pc.createDataChannel('neon-realtime',
            { ordered: false, maxRetransmits: 0 }), playerId);
        } catch {
          // Older WebViews may reject partial reliability; reliable transport
          // remains fully operational as a fallback.
        }
      } else pc.ondatachannel = e => this.bindChannel(e.channel, 'host');
      return pc;
    }
    bindChannel(channel, remoteId = this.role === 'host' ? 'guest' : 'host') {
      this.peers?.attach(remoteId, channel);
      const link = this.role === 'host' ? this.peerLinks.get(remoteId) : null;
      if (channel.label === 'neon-realtime' || channel.name === 'neon-realtime') {
        if (link) link.realtime = channel;
        if (!link || remoteId === 'guest') this.realtimeChannel = channel;
        channel.onmessage = event => {
          if (typeof event.data !== 'string' ||
            window.NeonLanSchema?.byteLength?.(event.data) > 40000) return;
          if (this.peers) this.peers.receive(remoteId, event.data, this.onData);
          else try { this.onData(JSON.parse(event.data)); } catch { /* malformed frame */ }
        };
        channel.onclose = () => {
          if (this.realtimeChannel === channel) this.realtimeChannel = null;
        };
        return;
      }
      if (link) link.control = channel;
      if (!link || remoteId === 'guest') this.channel = channel;
      channel.onopen = () => {
        this.connected = true;
        if (this.role === 'host' && this.roster) {
          if (!this.roster.has(remoteId)) this.roster.reserve(remoteId);
          this.roster.setStatus(remoteId, 'connected');
        }
        this.status('联机连接成功');
        this.onConnection?.(true, this.role === 'host' ? remoteId : this.localPlayerId);
      };
      channel.onclose = () => {
        if (link) this.peers?.remove(remoteId);
        this.connected = this.role === 'host' ? [...this.peerLinks.values()].some(p =>
          p.control?.readyState === 'open') : false;
        if (this.role === 'host' && this.roster?.has(remoteId))
          this.roster.setStatus(remoteId, 'disconnected');
        this.status('联机连接已关闭');
        this.onConnection?.(false, this.role === 'host' ? remoteId : this.localPlayerId);
      };
      channel.onmessage = event => {
        if (typeof event.data !== 'string' ||
          window.NeonLanSchema?.byteLength?.(event.data) > 40000) return;
        if (this.peers) this.peers.receive(remoteId, event.data, this.onData);
        else try { this.onData(JSON.parse(event.data)); } catch { /* ignore malformed frames */ }
      };
    }
    async makeOffer(playerId = 'guest') {
      if (this.role !== 'host' || !this.room) throw Error('请先创建房间');
      const seats = ['guest','guest-2','guest-3'].slice(0, this.capacity - 1);
      if (!seats.includes(playerId)) throw Error('无效的房客座位');
      const pc = this.makePeer(true, playerId);
      await pc.setLocalDescription(await pc.createOffer());
      await completeIce(pc);
      this.status('邀请信息已生成，请发给另一台设备');
      return JSON.stringify({ version: VERSION, room: this.room, kind: 'offer',
        playerId, capacity: this.capacity, description: pc.localDescription });
    }
    async acceptOffer(text) {
      const offer = parseSignal(text);
      if (offer.kind !== 'offer') throw Error('请粘贴房主的邀请信息');
      this.role = 'guest';
      this.room = offer.room;
      this.capacity = [2, 3, 4].includes(offer.capacity) ? offer.capacity : this.capacity;
      this.localPlayerId = ['guest','guest-2','guest-3'].includes(offer.playerId) ?
        offer.playerId : 'guest';
      const pc = this.makePeer(false);
      await pc.setRemoteDescription(offer.description);
      await pc.setLocalDescription(await pc.createAnswer());
      await completeIce(pc);
      this.status('应答信息已生成，请发回房主');
      return JSON.stringify({ version: VERSION, room: this.room, kind: 'answer',
        playerId: this.localPlayerId, description: pc.localDescription });
    }
    async acceptAnswer(text, playerId = 'guest') {
      const answer = parseSignal(text);
      if (this.role !== 'host' || answer.kind !== 'answer' || answer.room !== this.room ||
          (answer.playerId && answer.playerId !== playerId)) {
        throw Error('房间不匹配，无法接受应答');
      }
      const pc = this.peerLinks.get(playerId)?.pc || (playerId === 'guest' ? this.peer : null);
      if (!pc) throw Error('未找到对应房客连接');
      await pc.setRemoteDescription(answer.description);
      this.status('已接受应答，正在建立局域网连接');
    }
    sendTo(playerId, payload) {
      // The multiplayer transport addresses participants by the bound peer
      // identity, not by user-supplied fields inside gameplay messages.
      if (this.peers) {
        return this.peers.sendTo(playerId, payload);
      }
      if (playerId !== (this.role === 'host' ? 'guest' : 'host')) return false;
      // Time-sensitive input/snapshot packets may be dropped when superseded;
      // critical menu/profile events always use the reliable control channel.
      const isRealtime = payload?.type === 'input' || payload?.type === 'snapshot';
      const candidate = isRealtime && this.realtimeChannel?.readyState === 'open'
        ? this.realtimeChannel : this.channel;
      if (!candidate || candidate.readyState !== 'open') return false;
      const data = JSON.stringify(payload);
      // Bytes, not UTF-16 code units: a Chinese glyph or emoji in the `texts`
      // layer is 3-4 bytes, so String.length let a frame through at up to 3x the
      // 40k the channel actually tolerates.
      const bytes = window.NeonLanSchema?.byteLength?.(data) ?? data.length;
      if (bytes > 40000 || candidate.bufferedAmount > 100000) return false;
      candidate.send(data);
      return true;
    }
    broadcastToGuests(payloadByPlayerId, excludeId = null) {
      if (this.role !== 'host' || !this.peers) return [];
      return this.peers.broadcast(payloadByPlayerId, excludeId);
    }
    send(payload) {
      // Backward-compatible two-player API used by the existing UI and Coop.
      return this.sendTo(this.role === 'host' ? 'guest' : 'host', payload);
    }
    closePeer() {
      this.peers?.clear();
      for (const link of this.peerLinks.values()) {
        link.realtime?.close();
        link.control?.close();
        link.pc?.close();
      }
      this.peerLinks.clear();
      if (this.realtimeChannel) { this.realtimeChannel.close(); this.realtimeChannel = null; }
      if (this.channel) { this.channel.close(); this.channel = null; }
      if (this.peer) { this.peer.close(); this.peer = null; }
      this.connected = false;
    }
    close() {
      this.closePeer();
      this.role = null;
      this.room = null;
      this.broadcast?.close();
    }
  }
  window.NeonLanRTC = Object.freeze({ LanRTC, parseSignal, roomPattern });
})();
