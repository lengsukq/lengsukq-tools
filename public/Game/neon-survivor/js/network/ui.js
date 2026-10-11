/* Server-free LAN co-op lobby: manual cross-device signaling and
 * same-browser BroadcastChannel discovery. No automatic LAN-wide scan claim. */
(() => {
  'use strict';
  function open(game) {
    if (!window.NeonLanRTC || !window.NeonLanCoop) return;
    const previous = game.lanRTC;
    previous?.close();
    game.lanCoop?.stop();
    const rtc = new window.NeonLanRTC.LanRTC();
    const coop = new window.NeonLanCoop.Coop(game, rtc);
    game.lanRTC = rtc;
    game.lanCoop = coop;
    game.state = 'lan-lobby';
    let started = false;
    let leaveButton = null;
    const overlay = document.getElementById('neon-lan-lobby');
    if (overlay) overlay.remove();
    const ui = document.createElement('div');
    ui.id = 'neon-lan-lobby';
    ui.className = 'neon-lan-lobby';
    const card = document.createElement('section');
    card.className = 'neon-lan-card';
    ui.appendChild(card);
    document.body.appendChild(ui);
    const title = document.createElement('h2');
    title.textContent = '局域网双人合作 · WebRTC';
    title.style.cssText = 'color:#00f3ff;margin:0 0 12px;font-size:23px;';
    card.appendChild(title);
    const note = document.createElement('p');
    note.textContent = '无需独立游戏服务器。跨设备首次连接需交换邀请/应答文本；“查找房间”仅能自动发现同一浏览器环境的页面，纯网页不能扫描其他手机或电脑。';
    note.style.cssText = 'color:#b6c9df;line-height:1.7;';
    card.appendChild(note);
    const identityRow = document.createElement('div');
    identityRow.className = 'neon-lan-profile-preview';
    const identityText = document.createElement('span');
    function refreshIdentity() {
      const profile = window.NeonLanTeammates?.ownProfile(rtc.role === 'guest' ? 'guest' : 'host');
      identityText.textContent = '我的战机：' + (profile?.name || '房主');
      identityText.style.color = profile?.color || '#00f3ff';
    }
    refreshIdentity();
    const editIdentity = document.createElement('button');
    editIdentity.type = 'button';
    editIdentity.className = 'neon-lan-action';
    editIdentity.textContent = '修改昵称 / 战机颜色';
    editIdentity.onclick = () => window.NeonGameSettings?.open(game);
    identityRow.append(identityText, editIdentity);
    card.appendChild(identityRow);
    coop.onProfileChanged = refreshIdentity;
    const status = document.createElement('p');
    status.textContent = '先创建房间，或者输入房主给出的邀请信息。';
    status.style.cssText = 'border:1px solid #304e63;background:#0b1424;padding:10px;border-radius:8px;color:#ffd987;';
    card.appendChild(status);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:9px;margin:12px 0;';
    card.appendChild(row);
    function button(label, action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.className = 'neon-lan-action';
      b.onclick = async () => {
        b.disabled = true;
        try { await action(); } catch (error) { status.textContent = error.message || String(error); }
        finally { b.disabled = false; }
      };
      row.appendChild(b);
      return b;
    }
    const roomLabel = document.createElement('strong');
    roomLabel.style.cssText = 'display:block;color:#90f6dd;margin:10px 0;';
    card.appendChild(roomLabel);
    const rooms = document.createElement('div');
    card.appendChild(rooms);
    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = '连接信息（房主邀请 / 房客应答）：';
    fieldLabel.style.cssText = 'display:block;margin-top:14px;color:#c8e2f5;';
    card.appendChild(fieldLabel);
    const field = document.createElement('textarea');
    field.className = 'neon-lan-field';
    field.rows = 5;
    field.placeholder = '粘贴连接信息，另一台设备也可以复制并发送；不需要公网账号。';
    card.appendChild(field);
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:9px;margin:12px 0;';
    card.appendChild(controls);
    function control(label, action) {
      const b = button(label, action);
      row.removeChild(b); controls.appendChild(b);
      return b;
    }
    const manualSteps = document.createElement('p');
    manualSteps.textContent = '跨设备步骤：①房主创建房间并生成邀请 → ②把邀请复制给另一台设备 → ③房客粘贴并生成应答 → ④应答发回房主粘贴确认 → ⑤自动进入同一局。';
    manualSteps.style.cssText = 'color:#9eb0c3;font-size:12px;line-height:1.6;';
    card.appendChild(manualSteps);
    rtc.onStatus = message => { status.textContent = message; };
    rtc.onData = message => coop.onMessage(message);
    rtc.onConnection = connected => {
      if (connected && !started) {
        started = true;
        ui.remove();
        game.sound.init();
        if (rtc.role === 'host') {
          game.startNewGame();
          coop.startHost();
        } else {
          coop.startGuest();
        }
        leaveButton = document.createElement('button');
        leaveButton.type = 'button';
        leaveButton.textContent = '断开联机 · ' + rtc.room;
        leaveButton.style.cssText = 'position:fixed;top:70px;right:12px;z-index:90;border:1px solid #f77;border-radius:8px;background:#211525dd;color:#ffc8c8;padding:7px;font-size:11px;';
        leaveButton.onclick = () => {
          started = false;
          rtc.onConnection = null;
          rtc.close(); coop.stop(); leaveButton?.remove();
          game.showStartMenu();
        };
        document.body.appendChild(leaveButton);
      } else if (!connected && started) {
        started = false;
        leaveButton?.remove(); leaveButton = null;
        coop.stop();
        if (rtc.role === 'host' && game.state === 'playing') game.state = 'paused';
        status.textContent = '连接断开，可重新配对。';
        if (!ui.isConnected) document.body.appendChild(ui);
      }
    };
    rtc.onRooms = available => {
      rooms.replaceChildren();
      for (const entry of available) {
        const b = document.createElement('button');
        b.textContent = '加入本机浏览器房间 ' + entry.room;
        b.style.cssText = 'display:block;margin:7px 0;background:#153a42;color:#bdf6e6;border:1px solid #339c9c;padding:8px;border-radius:8px;';
        b.onclick = () => { try { rtc.joinDiscovered(entry.room, entry.from); } catch (e) { status.textContent = e.message; } };
        rooms.appendChild(b);
      }
      if (!available.length) rooms.textContent = '没有发现同浏览器房间。跨设备请使用手动配对。';
    };
    button('创建房间（作为房主）', () => {
      const room = rtc.host();
      refreshIdentity();
      roomLabel.textContent = '当前房间：' + room + ' · 等待另一位玩家';
    });
    button('查找房间（本机浏览器）', () => {
      rooms.textContent = '搜索同源浏览器标签页…';
      rtc.discover();
    });
    control('生成房主邀请', async () => {
      field.value = await rtc.makeOffer();
      field.select();
    });
    control('接受邀请并生成应答', async () => {
      const text = field.value;
      field.value = await rtc.acceptOffer(text);
      refreshIdentity();
      roomLabel.textContent = '房间：' + rtc.room + ' · 等待房主确认应答';
      field.select();
    });
    control('房主确认应答', () => rtc.acceptAnswer(field.value));
    control('复制连接信息', async () => {
      if (!field.value) throw Error('请先生成连接信息');
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(field.value);
      else { field.focus(); field.select(); document.execCommand?.('copy'); }
      status.textContent = '已尝试复制连接信息，请粘贴发给对方。';
    });
    const exit = control('退出联机界面', () => {
      rtc.close(); coop.stop(); ui.remove(); game.showStartMenu();
    });
    exit.style.borderColor = '#944b64';
    return { rtc, coop, ui };
  }
  window.NeonLanLobby = Object.freeze({ open });
})();
