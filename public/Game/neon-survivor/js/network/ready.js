/* Room readiness is a pre-match domain model, NOT a simulation loop.
 * 2–4 seats are supported; today's LAN transport connects two pilots.
 */
(() => {
  'use strict';
  const IDS = ['host', 'guest', 'guest-2', 'guest-3'];
  class ReadyRoom {
    constructor(capacity = 2) {
      if (![2, 3, 4].includes(capacity)) throw new Error('Invalid room capacity');
      this.capacity = capacity;
      this.members = new Map(IDS.slice(0, capacity).map(id =>
        [id, { id, connected: id === 'host', name: id === 'host' ? '房主' : '等待玩家',
          shipId: 'riftblade', ready: false, seq: -1 }]));
      this.revision = 0;
      this.started = false;
    }
    set(id, changes) {
      if (this.started || !this.members.has(id) || !changes || typeof changes !== 'object') return false;
      const member = this.members.get(id);
      if (changes.seq !== undefined &&
          (!Number.isSafeInteger(changes.seq) || changes.seq < 0 || changes.seq <= member.seq)) return false;
      if (changes.shipId !== undefined) {
        const ship = window.NeonShips?.get(changes.shipId);
        if (!ship?.playable) return false;
        if (ship.id !== member.shipId) member.ready = false;
        member.shipId = ship.id;
      }
      if (changes.connected !== undefined) {
        if (typeof changes.connected !== 'boolean') return false;
        if (!changes.connected) member.ready = false;
        member.connected = changes.connected;
      }
      if (changes.name !== undefined) {
        if (typeof changes.name !== 'string') return false;
        member.name = changes.name.trim().slice(0, 24) || (id === 'host' ? '房主' : '队友');
      }
      if (changes.ready !== undefined) {
        if (typeof changes.ready !== 'boolean' || (changes.ready && !member.connected)) return false;
        member.ready = changes.ready;
      }
      if (changes.seq !== undefined) member.seq = changes.seq;
      this.revision++;
      return true;
    }
    get(id) {
      const member = this.members.get(id);
      return member ? { ...member } : null;
    }
    canStart() {
      return !this.started && [...this.members.values()].every(m => m.connected && m.ready &&
        window.NeonShips?.get(m.shipId)?.playable === true);
    }
    snapshot() {
      return { capacity: this.capacity, revision: this.revision,
        canStart: this.canStart(), members: [...this.members.values()].map(({ seq, ...m }) => ({ ...m })) };
    }
    start() {
      if (!this.canStart()) return false;
      this.started = true;
      return true;
    }
  }

  // Only the host decides readiness/eligibility. The client renders this
  // capped, read-only projection and sends its own ready toggle and ship ID.
  function validSnapshot(value) {
    if (!value || ![2, 3, 4].includes(value.capacity) ||
        !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        !Array.isArray(value.members) || value.members.length !== value.capacity ||
        typeof value.canStart !== 'boolean') return false;
    return value.members.every((m, i) => m && m.id === IDS[i] &&
      typeof m.name === 'string' && m.name.length <= 24 &&
      typeof m.shipId === 'string' && m.shipId.length <= 32 &&
      typeof m.connected === 'boolean' && typeof m.ready === 'boolean');
  }
  function mount(coop) {
    if (typeof document === 'undefined') return;
    document.getElementById('neon-lan-ready')?.remove();
    const shell = document.createElement('div');
    shell.id = 'neon-lan-ready';
    shell.className = 'neon-ready-overlay';
    const content = document.createElement('section');
    content.className = 'neon-ready-panel';
    shell.appendChild(content);
    const title = document.createElement('h2');
    title.textContent = '出击准备 · 霓虹编队';
    content.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'neon-ready-subtitle';
    subtitle.textContent = '选择战舰并确认准备。所有玩家准备后，由房主启动战斗。';
    content.appendChild(subtitle);
    const roster = document.createElement('div');
    roster.className = 'neon-ready-roster';
    roster.setAttribute('aria-live', 'polite');
    content.appendChild(roster);
    const selectLabel = document.createElement('label');
    selectLabel.className = 'neon-ready-select-label';
    selectLabel.textContent = '我的战舰';
    const selector = document.createElement('select');
    selector.id = 'neon-ready-ship';
    for (const ship of window.NeonShips?.list(false) || []) {
      const option = document.createElement('option');
      option.value = ship.id;
      option.disabled = !ship.playable;
      option.textContent = ship.name + (ship.playable ? '' : '（开发中）');
      selector.appendChild(option);
    }
    selectLabel.appendChild(selector);
    content.appendChild(selectLabel);
    const description = document.createElement('p');
    description.className = 'neon-ready-ship-desc';
    content.appendChild(description);
    const buttons = document.createElement('div');
    buttons.className = 'neon-ready-actions';
    const ready = document.createElement('button');
    ready.type = 'button';
    ready.className = 'neon-ready-toggle';
    const readyText = document.createElement('span');
    readyText.textContent = '准备就绪';
    ready.appendChild(readyText);
    if (window.NeonGamepadHints) ready.appendChild(window.NeonGamepadHints.keyBadge('a'));
    ready.onclick = () => coop.setReady(!coop.localReady);
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'neon-ready-start';
    start.textContent = '全员准备 · 开始战斗';
    if (window.NeonGamepadHints) start.appendChild(window.NeonGamepadHints.keyBadge('start'));
    start.onclick = () => coop.beginHostMatch();
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'neon-ready-leave';
    leave.textContent = '离开房间';
    leave.onclick = () => coop.onReadyLeave?.();
    const info = document.createElement('span');
    info.className = 'neon-ready-hint';
    buttons.append(ready, start, leave);
    content.append(buttons, info);
    const hints = document.createElement('div');
    hints.className = 'neon-gamepad-hint-row';
    const prompt = window.NeonGamepadHints?.prompt;
    if (prompt) hints.append(
      prompt('切换战舰', 'lb'),
      prompt('准备/取消准备', 'a'),
      prompt('房主开始', 'start')
    );
    content.appendChild(hints);
    selector.onchange = () => coop.selectReadyShip(selector.value);
    document.body.appendChild(shell);
    coop.guestShipWaitPanel = shell; // Existing teardown target.
    coop.refreshReadyView = () => {
      const status = coop.readyRoom?.snapshot() || coop.remoteReady;
      if (!status) return;
      const mine = coop.rtc.role === 'host' ? 'host' : (coop.rtc.localPlayerId || 'guest');
      const current = status.members.find(m => m.id === mine);
      // On a guest, show their newly selected ship immediately; the host's
      // authoritative roster can arrive slightly later on the reliable link.
      const chosen = coop.rtc.role === 'guest'
        ? (coop.game.selectedShipId || 'riftblade')
        : (current?.shipId || coop.game.selectedShipId || 'riftblade');
      if ([...selector.options].some(opt => opt.value === chosen && !opt.disabled)) {
        selector.value = chosen;
      }
      const definition = window.NeonShips?.get(selector.value);
      description.textContent = definition?.description || '选择一个已开放的战舰';
      roster.replaceChildren();
      for (const player of status.members) {
        const card = document.createElement('div');
        card.className = 'neon-ready-member' +
          (player.ready ? ' is-ready' : '') + (!player.connected ? ' is-empty' : '');
        const identity = document.createElement('strong');
        identity.textContent = player.name + (player.id === 'host' ? ' · 房主' : '');
        const ship = document.createElement('span');
        ship.textContent = player.connected ?
          (window.NeonShips?.get(player.shipId)?.name || player.shipId) : '等待加入';
        const state = document.createElement('span');
        state.textContent = !player.connected ? '空位' : player.ready ? '已准备' : '未准备';
        state.className = 'neon-ready-state';
        card.append(identity, ship, state);
        roster.appendChild(card);
      }
      readyText.textContent = coop.localReady ? '取消准备' : '准备就绪';
      ready.disabled = !coop.rtc.connected || !current?.connected;
      start.hidden = coop.rtc.role !== 'host';
      start.disabled = !status.canStart;
      selector.disabled = coop.localReady;
      info.textContent = status.canStart
        ? '全员已准备，房主可以开始'
        : '等待所有队员确认战舰并准备';
    };
    coop.refreshReadyView();
  }
  function pollGamepad(coop, justPressed) {
    if (!coop || coop.game.state !== 'lan-waiting') return false;
    if (justPressed(4) || justPressed(5) || justPressed(14) || justPressed(15)) {
      if (!coop.localReady) {
        const choices = (window.NeonShips?.list(false) || []).filter(ship => ship.playable);
        if (choices.length > 1) {
          const at = Math.max(0, choices.findIndex(ship => ship.id === coop.game.selectedShipId));
          const move = justPressed(4) || justPressed(14) ? -1 : 1;
          coop.selectReadyShip(choices[(at + move + choices.length) % choices.length].id);
          coop.refreshReadyView?.();
        }
      }
    }
    if (justPressed(0)) coop.setReady(!coop.localReady);
    if (justPressed(1) && coop.localReady) coop.setReady(false);
    if (justPressed(9) && coop.rtc.role === 'host') coop.beginHostMatch();
    return true;
  }
  window.NeonLanReady = Object.freeze({ ReadyRoom, validSnapshot, mount, pollGamepad });
})();
