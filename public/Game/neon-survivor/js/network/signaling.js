/* Vercel Hobby room-code signaling client. HTTPS REST exchanges offer/answer ONLY;
 * gameplay continues using the LAN-only RTCDataChannel (iceServers: []).
 */
(() => {
  'use strict';
  const ENDPOINT = '/api/neon-lan/room';
  const CODE = /^[A-Z0-9]{6}$/;
  class RoomSignaling {
    constructor(onStatus = () => {}) {
      this.onStatus = onStatus;
      this.closed = false;
      this.room = null;
      this.hostToken = null;
      this.pollTimer = null;
      this.polling = false;
      this.capacity = 2;
      this.accepted = new Set();
    }
    async request(action, details = {}) {
      // AbortSignal.timeout() is unavailable in some tablet browsers/WebViews.
      // AbortController + a cleared timer works on older WebRTC-capable clients.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...details }),
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal
        });
        let data;
        try { data = await response.json(); } catch { throw Error('房间服务响应异常'); }
        if (!response.ok) throw Error(data.message || (data.error === 'signaling_unconfigured'
          ? '未配置 Upstash Redis，请使用高级手动配对' : '房间服务暂时不可用'));
        return data;
      } catch (error) {
        if (controller.signal.aborted) throw Error('连接房间服务超时，请检查网络并重试');
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    async create(rtc, capacity = 2, onReady) {
      this.cancel();
      this.closed = false;
      this.capacity = [2, 3, 4].includes(capacity) ? capacity : 2;
      this.accepted = new Set();
      rtc.host(this.capacity);
      this.onStatus('正在生成局域网连接信息…');
      const offers = {};
      for (const id of ['guest', 'guest-2', 'guest-3'].slice(0, this.capacity - 1)) {
        offers[id] = JSON.parse(await rtc.makeOffer(id));
      }
      const offer = offers.guest;
      const room = rtc.room;
      // Do not repeat the first SDP in large 3/4-player requests.
      const details = this.capacity === 2
        ? { room, offer, capacity: 2 }
        : { room, offers, capacity: this.capacity };
      const { hostToken } = await this.request('create', details);
      this.room = room;
      this.hostToken = hostToken;
      this.onStatus('房间 ' + room + ' 已创建，等待队友输入房间码');
      this.waitForGuest(rtc, onReady);
      return room;
    }
    async join(rtc, code) {
      this.cancel();
      this.closed = false;
      const room = String(code || '').toUpperCase().trim();
      if (!CODE.test(room)) throw Error('请输入6位有效房间码');
      this.onStatus('正在查找房间 ' + room + '…');
      const { offer, guestToken, playerId, capacity } = await this.request('join', { room });
      this.onStatus('已找到房间，正在建立 WebRTC 连接…');
      rtc.capacity = [2, 3, 4].includes(capacity) ? capacity : 2;
      const answer = JSON.parse(await rtc.acceptOffer(JSON.stringify(offer)));
      await this.request('answer', { room, guestToken, playerId: playerId || 'guest', answer });
      this.room = room;
      this.onStatus('应答已发送，等待局域网连接建立…');
      return room;
    }
    async waitForGuest(rtc, onReady) {
      if (this.polling) return;
      this.polling = true;
      let checks = 0;
      const poll = async () => {
        if (this.closed || !this.polling || !this.room || !this.hostToken) return;
        try {
          const { answer, answers } = await this.request('poll', {
            room: this.room, hostToken: this.hostToken
          });
          if (this.closed || !this.polling) return;
          const entries = Object.entries(answers || { guest: answer }).filter(([, value]) => value);
          for (const [id, signal] of entries) {
            if (this.accepted.has(id)) continue;
            await rtc.acceptAnswer(JSON.stringify(signal), id);
            this.accepted.add(id);
            // Seat ids are internal tokens ("guest", "guest-2", "guest-3").
            // Number them for the player instead of printing the token.
            const seat = id === 'guest' ? 1 : (Number(id.split('-')[1]) || 1);
            this.onStatus(`已连接队友 ${seat}，继续等待其他队员…`);
            onReady?.(id);
          }
          if (this.accepted.size >= this.capacity - 1) {
            this.polling = false;
            return;
          }
          if (++checks >= 74 && this.accepted.size === 0) {
            this.polling = false;
            this.onStatus('房间已超时，请重新创建');
            this.onExpired?.();
            return;
          }
        } catch (error) {
          if (this.closed) return;
          // Temporary network errors do not destroy an already-created room.
          this.onStatus('查找队友暂时失败，正在重试…');
        }
        if (!this.closed && this.polling) this.pollTimer = setTimeout(poll, 4000);
      };
      this.pollTimer = setTimeout(poll, 1000);
    }
    cancel() {
      this.polling = false;
      this.closed = true;
      if (this.pollTimer !== null) clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    async close() {
      this.cancel();
      if (this.room && this.hostToken) {
        try {
          await this.request('close', { room: this.room, hostToken: this.hostToken });
        } catch { /* short-lived keys expire without cleanup */ }
      }
      this.room = null;
      this.hostToken = null;
    }
  }
  window.NeonLanSignaling = Object.freeze({ RoomSignaling, ENDPOINT });
})();
