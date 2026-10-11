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
      this.connected = false;
      this.clientId = roomCode();
      this.rooms = new Map();
      this.broadcast = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
      if (this.broadcast) this.broadcast.onmessage = e => this.handleBroadcast(e.data);
    }
    status(text) { this.onStatus(safeText(text)); }
    host() {
      this.closePeer();
      this.role = 'host';
      this.room = roomCode();
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
        if (this.connected || this.peer) {
          this.status('当前双人房间已有成员或正在配对');
          return;
        }
        this.makeOffer().then(offer => this.broadcast?.postMessage({
          type: 'offer', from: this.clientId, to: msg.from, offer
        })).catch(error => this.status('自动连接失败：' + error.message));
      }
      if (msg.type === 'offer' && this.role === 'guest') {
        this.acceptOffer(msg.offer).then(answer => this.broadcast?.postMessage({
          type: 'answer', from: this.clientId, to: msg.from, answer
        })).catch(error => this.status('自动连接失败：' + error.message));
      }
      if (msg.type === 'answer' && this.role === 'host') {
        this.acceptAnswer(msg.answer).catch(error => this.status(error.message));
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
    makePeer(host) {
      if (typeof RTCPeerConnection === 'undefined') throw Error('该浏览器不支持 WebRTC');
      this.closePeer();
      const pc = new RTCPeerConnection({ iceServers: [] }); // no STUN or TURN
      this.peer = pc;
      pc.onconnectionstatechange = () => {
        if (this.peer !== pc) return;
        this.connected = pc.connectionState === 'connected';
        this.onConnection?.(this.connected);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          this.status('连接断开，请重新配对');
        }
      };
      if (host) this.bindChannel(pc.createDataChannel('neon-game'));
      else pc.ondatachannel = e => this.bindChannel(e.channel);
      return pc;
    }
    bindChannel(channel) {
      this.channel = channel;
      channel.onopen = () => {
        this.connected = true;
        this.status('联机连接成功');
        this.onConnection?.(true);
      };
      channel.onclose = () => {
        this.connected = false;
        this.status('联机连接已关闭');
        this.onConnection?.(false);
      };
      channel.onmessage = event => {
        if (typeof event.data !== 'string' || event.data.length > 40000) return;
        try { this.onData(JSON.parse(event.data)); } catch { /* ignore malformed frames */ }
      };
    }
    async makeOffer() {
      if (this.role !== 'host' || !this.room) throw Error('请先创建房间');
      const pc = this.makePeer(true);
      await pc.setLocalDescription(await pc.createOffer());
      await completeIce(pc);
      this.status('邀请信息已生成，请发给另一台设备');
      return JSON.stringify({ version: VERSION, room: this.room, kind: 'offer', description: pc.localDescription });
    }
    async acceptOffer(text) {
      const offer = parseSignal(text);
      if (offer.kind !== 'offer') throw Error('请粘贴房主的邀请信息');
      this.role = 'guest';
      this.room = offer.room;
      const pc = this.makePeer(false);
      await pc.setRemoteDescription(offer.description);
      await pc.setLocalDescription(await pc.createAnswer());
      await completeIce(pc);
      this.status('应答信息已生成，请发回房主');
      return JSON.stringify({ version: VERSION, room: this.room, kind: 'answer', description: pc.localDescription });
    }
    async acceptAnswer(text) {
      const answer = parseSignal(text);
      if (this.role !== 'host' || !this.peer || answer.kind !== 'answer' || answer.room !== this.room) {
        throw Error('房间不匹配，无法接受应答');
      }
      await this.peer.setRemoteDescription(answer.description);
      this.status('已接受应答，正在建立局域网连接');
    }
    send(payload) {
      if (!this.channel || this.channel.readyState !== 'open') return false;
      const data = JSON.stringify(payload);
      if (data.length > 40000 || this.channel.bufferedAmount > 100000) return false;
      this.channel.send(data);
      return true;
    }
    closePeer() {
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
