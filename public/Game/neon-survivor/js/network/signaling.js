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
    }
    async request(action, details = {}) {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...details }),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      });
      let data;
      try { data = await response.json(); } catch { throw Error('房间服务响应异常'); }
      if (!response.ok) throw Error(data.message || (data.error === 'signaling_unconfigured'
        ? '未配置 Upstash Redis，请使用高级手动配对' : '房间服务暂时不可用'));
      return data;
    }
    async create(rtc, onReady) {
      this.cancel();
      this.closed = false;
      rtc.host();
      this.onStatus('正在生成局域网连接信息…');
      const offer = JSON.parse(await rtc.makeOffer());
      const room = rtc.room;
      const { hostToken } = await this.request('create', { room, offer });
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
      const { offer, guestToken } = await this.request('join', { room });
      this.onStatus('已找到房间，正在建立 WebRTC 连接…');
      const answer = JSON.parse(await rtc.acceptOffer(JSON.stringify(offer)));
      await this.request('answer', { room, guestToken, answer });
      this.room = room;
      this.onStatus('应答已发送，等待局域网连接建立…');
      return room;
    }
    async waitForGuest(rtc, onReady) {
      if (this.polling) return;
      this.polling = true;
      let checks = 0;
      const poll = async () => {
        if (this.closed || !this.polling || !this.room || !this.hostToken || rtc.connected) return;
        try {
          const { answer } = await this.request('poll', { room: this.room, hostToken: this.hostToken });
          if (this.closed || !this.polling) return;
          if (answer) {
            this.polling = false;
            await rtc.acceptAnswer(JSON.stringify(answer));
            this.onStatus('已收到应答，正在建立局域网直连…');
            onReady?.();
            return;
          }
          if (++checks >= 74) {
            this.polling = false;
            this.onStatus('房间已超时，请重新创建');
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
