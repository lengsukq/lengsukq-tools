/* Same-origin QR invites carry ONLY the temporary room code.
 * Browser camera apps scan the QR; the destination then joins automatically.
 * QR rendering is performed locally, without sending the URL to QR services.
 */
(() => {
  'use strict';
  const CODE = /^[A-Z0-9]{6}$/;
  const GAME_PATH = '/Game/neon-survivor/index.html';

  function build(room, origin) {
    const code = String(room || '').toUpperCase();
    if (!CODE.test(code)) throw Error('无效的6位联机房间码');
    const url = new URL(GAME_PATH, origin || window.location.origin);
    if (!/^https?:$/.test(url.protocol)) throw Error('联机邀请必须使用 HTTP(S) 链接');
    url.searchParams.set('lanRoom', code);
    url.searchParams.set('lanAutoJoin', '1');
    return url.toString();
  }
  function parse(href) {
    try {
      const url = new URL(href);
      if (!/^https?:$/.test(url.protocol) || url.pathname !== GAME_PATH) return null;
      // Reject ambiguous parameters so links cannot silently select another room.
      if (url.searchParams.getAll('lanRoom').length !== 1 ||
          url.searchParams.getAll('lanAutoJoin').length > 1) return null;
      const room = (url.searchParams.get('lanRoom') || '').toUpperCase();
      if (!CODE.test(room)) return null;
      return { room, autoJoin: url.searchParams.get('lanAutoJoin') === '1' };
    } catch { return null; }
  }
  function render(container, url) {
    if (!container) throw Error('二维码容器不存在');
    if (typeof window.QRCode !== 'function') throw Error('二维码组件未加载，请复制邀请链接');
    container.replaceChildren();
    // qrcodejs v1.0.0 is hosted with the game: no third-party QR/image calls.
    return new window.QRCode(container, {
      text: url, width: 200, height: 200, colorDark: '#061b29',
      colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M
    });
  }
  window.NeonLanInvite = Object.freeze({ build, parse, render, GAME_PATH });
})();
