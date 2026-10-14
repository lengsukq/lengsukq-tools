/* Dedicated mobile-friendly settings. All preferences stay on this device.
 * Works in single-player and while participating as a LAN guest.
 */
(() => {
  'use strict';
  const KEY = 'neon_game_settings_v1';
  const defaults = Object.freeze({
    sound: true, autoAim: true, vibration: true, crt: true,
    lowEffects: false, dashSize: 68, dashOpacity: 90, joystickDeadzone: 10,
    cameraZoom: 100, playerName: '', shipColor: 'auto',
    controlLayout: 'arc', controlSide: 'right'
  });
  const colorOptions = Object.freeze([
    ['auto', '自动区分', '#00f3ff'], ['cyan', '霓虹蓝', '#00f3ff'],
    ['amber', '琥珀橙', '#ffbb55'], ['violet', '星云紫', '#b18aff'],
    ['mint', '薄荷绿', '#68ffd2'], ['pink', '幻影粉', '#ff77b7'],
    ['gold', '星辉金', '#ffe179']
  ]);
  const colorKeys = new Set(colorOptions.map(item => item[0]));
  let state = { ...defaults };
  const swatches = [];
  let overlay = null;
  let priorState = null;
  let initialized = false;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));
  function readPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      // Ignore previously persisted autoAim=false: targeting is now mandatory.
      for (const key of ['sound','vibration','crt','lowEffects']) {
        if (typeof raw[key] === 'boolean') state[key] = raw[key];
      }
      for (const [key, low, high] of [
        ['dashSize', 54, 100], ['dashOpacity', 50, 100], ['joystickDeadzone', 3, 26],
        ['cameraZoom', 65, 150]
      ]) if (Number.isFinite(raw[key])) state[key] = clamp(raw[key], low, high);
      if (typeof raw.playerName === 'string') {
        state.playerName = raw.playerName.replace(/<[^>]*>/g, '')
          .replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0, 12);
      }
      if (colorKeys.has(raw.shipColor)) state.shipColor = raw.shipColor;
      if (['arc', 'compact'].includes(raw.controlLayout)) state.controlLayout = raw.controlLayout;
      if (['right', 'left'].includes(raw.controlSide)) state.controlSide = raw.controlSide;
    } catch { /* localStorage can be blocked */ }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  }
  function apply(game = window.game) {
    const root = document.documentElement;
    root.style.setProperty('--neon-dash-size', state.dashSize + 'px');
    root.style.setProperty('--neon-dash-opacity', String(state.dashOpacity / 100));
    root.setAttribute('data-neon-control-layout', state.controlLayout);
    root.setAttribute('data-neon-control-side', state.controlSide);
    for (const [id, key] of [['neon-control-layout','controlLayout'],['neon-control-side','controlSide']]) {
      const field = document.getElementById(id);
      if (field && field.value !== state[key]) field.value = state[key];
    }
    for (const [id, key] of [['neon-control-layout','controlLayout'],['neon-control-side','controlSide']]) {
      const field = document.getElementById(id);
      if (field) field.onchange = () => set(key, field.value, window.game);
    }
    const crt = document.getElementById('crtOverlay');
    if (crt) crt.style.opacity = state.crt ? '1' : '0';
    if (!game) return;
    game.player.autoAim = true;
    const profile = window.NeonLanTeammates?.ownProfile(game.lanRTC?.role === 'guest' ? 'guest' : 'host');
    if (profile) game.shipColor = profile.color;
    // Percentage maps to the camera transform, not HUD or touch hit areas.
    game.cameraZoom = state.cameraZoom / 100;
    game.gamepadVibrationEnabled = state.vibration;
    game.fxLow = state.lowEffects;
    // Canvas shadow blur costs an extra blur pass per primitive on mobile GPUs,
    // so low-effects mode drops it entirely. Adaptive quality may lower it
    // further at runtime; it never forces it back on.
    game.fxShadow = !state.lowEffects;
    const dpr = Math.min(window.devicePixelRatio || 1, state.lowEffects ? 1.25 : 2);
    if (game.dpr !== dpr) {
      game.dpr = dpr;
      game.resize?.();
    }
    if (game.sound) {
      game.sound.enabled = state.sound;
      if (game.sound.masterGain) game.sound.masterGain.gain.value = state.sound ? 0.28 : 0;
    }
    for (const [id, value] of [
      ['btn-sound', state.sound ? '🔊' : '🔇'],
      ['btn-vibrate', state.vibration ? '📳' : '🔕']
    ]) { const btn = document.getElementById(id); if (btn) btn.textContent = value; }
  }
  function set(key, value, game) {
    if (!(key in defaults)) return;
    if (key === 'autoAim') state.autoAim = true; // Legacy callers cannot disable it.
    else if (typeof defaults[key] === 'boolean') state[key] = Boolean(value);
    else if (key === 'playerName') state[key] = String(value || '').replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0, 12);
    else if (key === 'shipColor') state[key] = colorKeys.has(value) ? value : 'auto';
    else if (key === 'controlLayout') state[key] = ['arc','compact'].includes(value) ? value : 'arc';
    else if (key === 'controlSide') state[key] = ['left','right'].includes(value) ? value : 'right';
    else {
      const bounds = { dashSize: [54,100], dashOpacity:[50,100], joystickDeadzone:[3,26], cameraZoom:[65,150] };
      state[key] = clamp(value, ...bounds[key]);
    }
    persist();
    apply(game);
    if (key === 'playerName' || key === 'shipColor') {
      game?.lanCoop?.sendLocalProfile?.();
      game?.lanCoop?.onProfileChanged?.();
    }
    swatches.forEach(({ key, button }) => {
      button.setAttribute('aria-pressed', String(key === state.shipColor));
      button.classList.toggle('active', key === state.shipColor);
    });
  }
  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    const game = window.game;
    if (game) {
      game.settingsOpen = false;
      if (priorState === 'playing' && game.state === 'paused') {
        game.state = 'playing';
        game.lastTime = performance.now();
      }
    }
    priorState = null;
  }
  function build() {
    overlay = document.createElement('div');
    overlay.id = 'neon-settings-modal';
    overlay.className = 'neon-settings-overlay';
    overlay.hidden = true;
    const card = document.createElement('section');
    card.className = 'neon-settings-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', '游戏设置');
    const heading = document.createElement('header');
    heading.className = 'neon-settings-header';
    const title = document.createElement('h2');
    title.textContent = '游戏设置';
    const exit = document.createElement('button');
    exit.type = 'button'; exit.className = 'neon-settings-close';
    exit.textContent = '完成 ✕'; exit.onclick = close;
    heading.append(title, exit); card.appendChild(heading);
    function section(name) {
      const group = document.createElement('div');
      group.className = 'neon-settings-group';
      const label = document.createElement('h3'); label.textContent = name;
      group.appendChild(label); card.appendChild(group);
      return group;
    }
    function toggle(parent, key, label, description) {
      const row = document.createElement('label');
      row.className = 'neon-setting-row';
      const info = document.createElement('span');
      info.className = 'neon-setting-info';
      const caption = document.createElement('strong'); caption.textContent = label;
      const sub = document.createElement('small'); sub.textContent = description;
      info.append(caption, sub);
      const input = document.createElement('input'); input.type = 'checkbox';
      input.id = 'neon-setting-' + key; input.checked = state[key];
      input.onchange = () => set(key, input.checked, window.game);
      row.append(info, input); parent.appendChild(row);
    }
    function range(parent, key, label, unit, min, max, step = 1) {
      const row = document.createElement('label');
      row.className = 'neon-setting-row range-row';
      const head = document.createElement('span'); head.className = 'neon-setting-info';
      const caption = document.createElement('strong'); caption.textContent = label;
      const number = document.createElement('small'); number.textContent = state[key] + unit;
      head.append(caption, number);
      const input = document.createElement('input'); input.type = 'range';
      input.id = 'neon-setting-' + key;
      input.min = String(min); input.max = String(max);
      input.step = String(step); input.value = String(state[key]);
      input.oninput = () => { set(key, Number(input.value), window.game); number.textContent = state[key] + unit; };
      row.append(head, input); parent.appendChild(row);
    }
    const audio = section('音效和战斗');
    toggle(audio, 'sound', '游戏音效', '开关背景音乐、攻击音效');
    toggle(audio, 'vibration', '手柄震动', '仅支持提供震动功能的设备');
    const profileGroup = section('联机身份 · 战机外观');
    const nameRow = document.createElement('label');
    nameRow.className = 'neon-setting-row';
    const nameInfo = document.createElement('span');
    nameInfo.className = 'neon-setting-info';
    const nameTitle = document.createElement('strong');
    nameTitle.textContent = '战机昵称';
    const nameHint = document.createElement('small');
    nameHint.textContent = '最多12个字符，联机时队友可见；不填则按身份显示房主/队友';
    nameInfo.append(nameTitle, nameHint);
    const nameInput = document.createElement('input');
    nameInput.id = 'neon-setting-playerName';
    nameInput.className = 'neon-setting-name';
    nameInput.type = 'text';
    nameInput.maxLength = 12;
    nameInput.placeholder = '我的战机';
    nameInput.value = state.playerName;
    nameInput.autocomplete = 'off';
    nameInput.onchange = () => set('playerName', nameInput.value, window.game);
    nameRow.append(nameInfo, nameInput);
    profileGroup.appendChild(nameRow);
    const colorHint = document.createElement('p');
    colorHint.className = 'neon-setting-help';
    colorHint.textContent = '战机颜色（自动区分时房主蓝色、队友橙色）';
    profileGroup.appendChild(colorHint);
    const colorRow = document.createElement('div');
    colorRow.className = 'neon-color-options';
    for (const [key, caption, hex] of colorOptions) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'neon-color-swatch';
      swatch.id = 'neon-setting-color-' + key;
      swatch.title = caption;
      swatch.setAttribute('aria-label', caption);
      swatch.setAttribute('aria-pressed', String(key === state.shipColor));
      swatch.style.setProperty('--swatch-color', hex);
      swatch.textContent = key === 'auto' ? '自动' : '◆';
      swatch.onclick = () => set('shipColor', key, window.game);
      swatches.push({ key, button: swatch });
      colorRow.appendChild(swatch);
    }
    profileGroup.appendChild(colorRow);
    const video = section('画面');
    toggle(video, 'crt', '扫描线效果', '关闭后画面更加清晰');
    toggle(video, 'lowEffects', '低特效模式', '减少粒子生成，适合性能较低的手机');
    range(video, 'cameraZoom', '战场视角缩放', '%', 65, 150, 5);
    const zoomInfo = document.createElement('p');
    zoomInfo.className = 'neon-setting-help';
    zoomInfo.textContent = '100% 为原始视角；低于100%视野更广，高于100%更靠近战机。只影响战场，不改变操控按钮与文字。';
    video.appendChild(zoomInfo);
    const touch = section('触屏操作');
    function choice(parent, key, label, options) {
      const row = document.createElement('label');
      row.className = 'neon-setting-row';
      const name = document.createElement('strong'); name.textContent = label;
      const field = document.createElement('select');
      field.id = 'neon-setting-' + key;
      for (const [value, caption] of options) {
        const option = document.createElement('option');
        option.value = value; option.textContent = caption; field.appendChild(option);
      }
      field.value = state[key];
      field.onchange = () => set(key, field.value, window.game);
      row.append(name, field); parent.appendChild(row);
    }
    choice(touch, 'controlLayout', '技能布局', [['arc','王者式弧形'],['compact','紧凑横排']]);
    choice(touch, 'controlSide', '操作方向', [['right','右手'],['left','左手']]);
    range(touch, 'dashSize', '折跃按钮大小', 'px', 54, 100, 2);
    range(touch, 'dashOpacity', '折跃按钮不透明度', '%', 50, 100, 5);
    range(touch, 'joystickDeadzone', '摇杆死区', 'px', 3, 26, 1);
    const footer = document.createElement('p');
    footer.className = 'neon-settings-foot';
    footer.textContent = '设置自动保存在本机浏览器。两指操作时，移动摇杆与折跃按钮互不干扰。';
    card.appendChild(footer);
    overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }
  function open(game = window.game) {
    if (!initialized) init();
    if (!overlay || !game) return;
    if (!overlay.hidden) return;
    priorState = game.state;
    game.settingsOpen = true;
    game.releaseJoystickTouch?.();
    if (game.state === 'playing') {
      game.state = 'paused';
      // Opening settings on the host pauses the same authoritative world.
      if (game.lanCoop?.ally) {
        game.lanCoop.ally.input = {
          dx: 0, dy: 0, aim: game.lanCoop.ally.aimAngle, dash: false
        };
        game.lanCoop.ally.lastInputAt = 0;
      }
    }
    overlay.hidden = false;
    for (const key of Object.keys(defaults)) {
      const field = document.getElementById('neon-setting-' + key);
      if (!field) continue;
      if (field.type === 'checkbox') field.checked = state[key];
      else if (field.type !== 'button') field.value = String(state[key]);
    }
    swatches.forEach(({ key, button }) => {
      button.setAttribute('aria-pressed', String(key === state.shipColor));
      button.classList.toggle('active', key === state.shipColor);
    });
  }
  function init() {
    if (initialized) return;
    initialized = true;
    readPrefs();
    build();
    for (const id of ['btn-settings', 'btn-start-settings', 'btn-pause-settings']) {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => open(window.game));
    }
    const floating = document.createElement('button');
    floating.id = 'btn-guest-settings';
    floating.className = 'neon-guest-settings';
    floating.textContent = '⚙ 设置';
    floating.type = 'button';
    floating.addEventListener('click', () => open(window.game));
    document.body.appendChild(floating);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay && !overlay.hidden) {
        e.stopImmediatePropagation();
        e.preventDefault(); close();
      }
    }, true);
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.NeonGameSettings = Object.freeze({ init, open, close, set, apply,
    get(key) { return state[key]; }, defaults });
})();
