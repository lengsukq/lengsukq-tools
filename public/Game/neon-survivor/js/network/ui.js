/* Simple room-code pairing on Vercel; manual copy/paste remains a fallback.
 * Actual game traffic stays on direct LAN WebRTC, never the Vercel API.
 */
(() => {
  'use strict';
  function open(game, options = {}) {
    if (!window.NeonLanRTC || !window.NeonLanCoop) return;
    const previous = game.lanRTC;
    previous?.close();
    game.lanCoop?.stop();
    const rtc = new window.NeonLanRTC.LanRTC();
    const signaling = window.NeonLanSignaling
      ? new window.NeonLanSignaling.RoomSignaling(message => { status.textContent = message; })
      : null;
    const coop = new window.NeonLanCoop.Coop(game, rtc);
    game.lanRTC = rtc;
    game.lanCoop = coop;
    game.state = 'lan-lobby';
    let started = false;
    let leaveButton = null;
    const closeLobby = () => {
      started = false;
      rtc.onConnection = null;
      void signaling?.close();
      rtc.close();
      coop.stop();
      leaveButton?.remove();
      leaveButton = null;
      ui.remove();
      game.showStartMenu();
    };
    coop.onReadyLeave = closeLobby;
    const overlay = document.getElementById('neon-lan-lobby');
    if (overlay) overlay.remove();
    const ui = document.createElement('div');
    ui.id = 'neon-lan-lobby';
    ui.className = 'neon-lan-lobby';
    const card = document.createElement('section');
    card.className = 'neon-lan-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', '局域网多人合作');
    ui.appendChild(card);
    document.body.appendChild(ui);
    const header = document.createElement('div');
    header.className = 'neon-lan-header';
    card.appendChild(header);
    const title = document.createElement('h2');
    title.id = 'neon-lan-title';
    title.textContent = '局域网多人合作 · WebRTC（2–4人）';
    header.appendChild(title);
    const back = document.createElement('button');
    back.type = 'button';
    back.id = 'neon-lan-back';
    back.className = 'neon-lan-back';
    back.textContent = '← 返回机库';
    back.setAttribute('aria-label', '关闭联机界面，返回机库');
    back.onclick = closeLobby;
    header.appendChild(back);
    card.setAttribute('aria-labelledby', title.id);
    ui.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || game.settingsOpen) return;
      event.preventDefault();
      event.stopPropagation();
      closeLobby();
    });
    const note = document.createElement('p');
    note.textContent = '房主创建6位房间码，队友输入即可加入。Vercel只交换临时连接信息，游戏数据仍经同一局域网的WebRTC直连。';
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
    const joinRow = document.createElement('div');
    joinRow.className = 'neon-lan-code-row';
    const joinCode = document.createElement('input');
    joinCode.type = 'text';
    joinCode.className = 'neon-lan-code-input';
    joinCode.placeholder = '6位房间码';
    joinCode.maxLength = 6;
    joinCode.autocomplete = 'off';
    joinCode.autocapitalize = 'characters';
    joinCode.setAttribute('aria-label', '输入6位房间码');
    joinCode.oninput = () => { joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); };
    const invitedCode = options.roomCode || window.NeonLanInvite?.parse(window.location?.href)?.room;
    if (typeof invitedCode === 'string' && /^[A-Z0-9]{6}$/.test(invitedCode.toUpperCase())) {
      joinCode.value = invitedCode.toUpperCase();
    }
    joinRow.appendChild(joinCode);
    card.appendChild(joinRow);
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
    const capacityRow = document.createElement('label');
    capacityRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin:12px 0;color:#c3e8ff;font-weight:700;';
    capacityRow.textContent = '房间人数';
    const capacitySelect = document.createElement('select');
    capacitySelect.id = 'neon-lan-capacity';
    capacitySelect.style.cssText = 'min-height:44px;background:#15324c;color:#effaff;border:1px solid #66bedb;border-radius:9px;padding:7px 15px;';
    for (const size of [2, 3, 4]) {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = size + ' 人';
      capacitySelect.appendChild(option);
    }
    capacityRow.appendChild(capacitySelect);
    card.appendChild(capacityRow);
    const invitePanel = document.createElement('section');
    invitePanel.className = 'neon-lan-qr-panel';
    invitePanel.hidden = true;
    const qrSide = document.createElement('div');
    qrSide.className = 'neon-lan-qr-code';
    qrSide.setAttribute('aria-label', '扫码加入当前联机房间');
    const inviteInfo = document.createElement('div');
    inviteInfo.className = 'neon-lan-qr-info';
    const inviteTitle = document.createElement('strong');
    inviteTitle.textContent = '手机扫码 · 自动加入';
    const inviteCaption = document.createElement('p');
    inviteCaption.textContent = '让最多三位队友扫码加入房间。二维码约5分钟内有效，所有设备都必须能通过局域网直连房主。';
    const inviteLink = document.createElement('a');
    inviteLink.className = 'neon-lan-invite-url';
    inviteLink.target = '_blank';
    inviteLink.rel = 'noopener noreferrer';
    inviteInfo.append(inviteTitle, inviteCaption, inviteLink);
    invitePanel.append(qrSide, inviteInfo);
    card.appendChild(invitePanel);
    if (signaling) signaling.onExpired = () => {
      invitePanel.hidden = true;
      roomLabel.textContent = '房间已过期 · 请重新创建';
    };
    function showInvite(room) {
      const invite = window.NeonLanInvite;
      if (!invite) return;
      const link = invite.build(room, window.location.origin);
      invitePanel.hidden = false;
      inviteLink.href = link;
      inviteLink.textContent = '打开或分享邀请链接';
      try {
        invite.render(qrSide, link);
      } catch (error) {
        qrSide.replaceChildren();
        qrSide.textContent = '二维码不可用，可复制邀请链接';
        status.textContent = error.message || '二维码加载失败，可复制邀请链接';
      }
    }
    const rooms = document.createElement('div');
    card.appendChild(rooms);
    const advanced = document.createElement('details');
    advanced.className = 'neon-lan-advanced';
    const advancedSummary = document.createElement('summary');
    advancedSummary.textContent = '高级连接 / 手动配对（无信令服务时使用）';
    advanced.appendChild(advancedSummary);
    card.appendChild(advanced);
    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = '连接信息（房主邀请 / 房客应答）：';
    fieldLabel.style.cssText = 'display:block;margin-top:14px;color:#c8e2f5;';
    advanced.appendChild(fieldLabel);
    const field = document.createElement('textarea');
    field.className = 'neon-lan-field';
    field.rows = 5;
    field.placeholder = '粘贴连接信息，另一台设备也可以复制并发送；不需要公网账号。';
    advanced.appendChild(field);
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:9px;margin:12px 0;';
    advanced.appendChild(controls);
    function control(label, action) {
      const b = button(label, action);
      row.removeChild(b); controls.appendChild(b);
      return b;
    }
    const manualSteps = document.createElement('p');
    manualSteps.textContent = '跨设备步骤：①房主创建房间并生成邀请 → ②把邀请复制给另一台设备 → ③房客粘贴并生成应答 → ④应答发回房主粘贴确认 → ⑤自动进入同一局。';
    manualSteps.style.cssText = 'color:#9eb0c3;font-size:12px;line-height:1.6;';
    advanced.appendChild(manualSteps);
    rtc.onStatus = message => { status.textContent = message; };
    rtc.onData = (message, remotePlayerId) => coop.onMessage(message, remotePlayerId);
    rtc.onConnection = (connected, playerId = 'guest') => {
      if (connected && !started) {
        started = true;
        if (rtc.role !== 'host') void signaling?.close();
        ui.remove();
        game.sound.init();
        if (rtc.role === 'host') {
          coop.awaitGuestShip();
        } else {
          coop.enterGuestReady();
        }
        leaveButton = document.createElement('button');
        leaveButton.type = 'button';
        leaveButton.id = 'neon-lan-leave';
        leaveButton.className = 'hud-btn neon-lan-leave';
        leaveButton.textContent = '⏏';
        leaveButton.title = '断开联机 · ' + rtc.room;
        leaveButton.setAttribute('aria-label', '断开联机，房间 ' + rtc.room);
        leaveButton.onclick = () => coop.onReadyLeave();
        // HUD owns the top-right action row and its responsive positioning.
        // Never float a second row over the timer/kill/crystal indicators.
        (document.querySelector('#hud .hud-right') || document.body).appendChild(leaveButton);
      } else if (connected && started && rtc.role === 'host') {
        coop.onPeerConnected?.(playerId);
      } else if (!connected && started) {
        if (rtc.role === 'host') {
          coop.onPeerDisconnected?.(playerId);
          if (!rtc.connected && game.state === 'playing') game.state = 'paused';
          return;
        }
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
    button('创建房间', async () => {
      if (!signaling) throw Error('浏览器不支持房间码信令，请使用高级手动配对');
      invitePanel.hidden = true;
      const room = await signaling.create(rtc, Number(capacitySelect.value || 2));
      refreshIdentity();
      roomLabel.textContent = '房间码：' + room + ' · 等待队友';
      joinCode.value = room;
      showInvite(room);
    });
    async function joinRoom() {
      if (!signaling) throw Error('浏览器不支持房间码信令，请使用高级手动配对');
      const room = await signaling.join(rtc, joinCode.value);
      refreshIdentity();
      roomLabel.textContent = '正在加入：' + room;
      return room;
    }
    const join = button('输入房间码加入', joinRoom);
    joinRow.appendChild(join);
    row.removeChild(join);
    button('复制邀请链接', async () => {
      if (!signaling?.room || !signaling.hostToken) throw Error('请先创建房间');
      const link = window.NeonLanInvite.build(signaling.room, window.location.origin);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        status.textContent = '邀请链接已复制；队友打开后将自动加入房间';
      } else {
        status.textContent = '邀请链接：' + link;
      }
    });
    control('手动创建房间', () => {
      void signaling?.close();
      invitePanel.hidden = true;
      const room = rtc.host(Number(capacitySelect.value || 2));
      refreshIdentity();
      roomLabel.textContent = '手动配对房间：' + room;
    });
    control('查找同浏览器房间', () => {
      rooms.textContent = '搜索同源浏览器标签页…';
      rtc.discover();
    });
    control('生成房主邀请', async () => {
      const nextId = ['guest','guest-2','guest-3'].find(id => !rtc.peerLinks?.has(id));
      if (!nextId) throw Error('当前房间的邀请数量已满');
      field.value = await rtc.makeOffer(nextId);
      field.select();
    });
    control('接受邀请并生成应答', async () => {
      const text = field.value;
      field.value = await rtc.acceptOffer(text);
      refreshIdentity();
      roomLabel.textContent = '房间：' + rtc.room + ' · 等待房主确认应答';
      field.select();
    });
    control('房主确认应答', () => {
      const answer = JSON.parse(field.value);
      return rtc.acceptAnswer(field.value, answer.playerId || 'guest');
    });
    control('复制连接信息', async () => {
      if (!field.value) throw Error('请先生成连接信息');
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(field.value);
      else { field.focus(); field.select(); document.execCommand?.('copy'); }
      status.textContent = '已尝试复制连接信息，请粘贴发给对方。';
    });
    const exit = control('退出联机界面', closeLobby);
    exit.style.borderColor = '#944b64';
    // Camera-scanned invitation: open the lobby and start the same room-code
    // signaling path automatically. Errors stay in the visible lobby so guests
    // can retry manually, without reloading or re-scanning.
    if (options.autoJoin && /^[A-Z0-9]{6}$/.test(joinCode.value)) {
      join.disabled = true;
      status.textContent = '已扫描邀请，正在自动加入房间 ' + joinCode.value + '…';
      void Promise.resolve().then(joinRoom).catch(error => {
        status.textContent = (error.message || String(error)) + '；可以检查房间码后重新加入';
      }).finally(() => { if (ui.isConnected) join.disabled = false; });
    }
    return { rtc, coop, ui };
  }
  window.NeonLanLobby = Object.freeze({ open });
})();
