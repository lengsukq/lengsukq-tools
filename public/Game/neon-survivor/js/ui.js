/* Neon Survivor V3: responsive reward selection and endless phase HUD. */
(() => {
  'use strict';
  let modal = null;
  let hud = null;
  let selection = null;
  let analogNavAt = 0;

  function ensure() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'neon-rogue-choice';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(3,7,20,.92);z-index:100;display:none;overflow-y:auto;padding:24px 14px;align-items:center;justify-content:center;';
    const container = document.createElement('div');
    container.className = 'rogue-choice-body';
    container.style.cssText = 'width:min(920px,100%);margin:auto;padding:18px;border:1px solid #245579;border-radius:18px;background:linear-gradient(150deg,#102136,#100e22);box-shadow:0 0 40px #00f3ff22;';
    modal.appendChild(container);
    document.body.appendChild(modal);
    hud = document.createElement('div');
    hud.id = 'neon-rogue-hud';
    hud.style.cssText = 'position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:8;max-width:90vw;background:#090e1bd9;border:1px solid #4b6b8c;border-radius:12px;padding:7px 13px;text-align:center;color:#b9edff;font:600 12px system-ui;pointer-events:none;display:none;white-space:normal;';
    document.body.appendChild(hud);
  }

  function paint() {
    if (!selection) return;
    const body = modal.firstChild;
    body.replaceChildren();
    const title = document.createElement('h2');
    title.style.cssText = 'color:#00f3ff;text-align:center;font-size:clamp(19px,4vw,28px);margin:0 0 8px;';
    title.textContent = selection.title;
    body.appendChild(title);
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:13px;text-align:center;color:#a6b9d0;margin:0 0 16px;';
    hint.textContent = '选择一项继续。手柄十字键或摇杆选择，A 键确认。键盘 ← → / Enter。';
    body.appendChild(hint);
    const cards = document.createElement('div');
    cards.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(215px,100%),1fr));gap:12px;';
    selection.options.forEach((opt, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.style.cssText = 'min-height:160px;cursor:pointer;text-align:left;padding:16px;background:linear-gradient(155deg,#142b3f,#12152e);color:#e4f7ff;border:2px solid ' +
        (selection.index === i ? '#00f3ff' : '#3b4b68') + ';border-radius:13px;box-shadow:' +
        (selection.index === i ? '0 0 22px #00f3ff44' : 'none') + ';';
      const head = document.createElement('strong');
      head.style.cssText = 'display:block;font-size:18px;margin-bottom:10px;';
      head.textContent = opt.name;
      const detail = document.createElement('span');
      detail.style.cssText = 'font-size:13px;line-height:1.6;color:#b6cddd;';
      detail.textContent = opt.desc;
      card.append(head, detail);
      card.addEventListener('click', () => choose(i));
      card.addEventListener('focus', () => { if (selection) selection.index = i; });
      cards.appendChild(card);
    });
    body.appendChild(cards);
  }
  function open(game, title, options, onChoose) {
    if (!options.length || typeof onChoose !== 'function') return false;
    ensure();
    game.releaseJoystickTouch?.();
    game.state = 'endless-choice';
    selection = { game, title, options, index: 0, onChoose };
    analogNavAt = 0;
    modal.style.display = 'flex';
    paint();
    return true;
  }
  function choose(index) {
    if (!selection || index < 0 || index >= selection.options.length) return;
    const { game, options, onChoose } = selection;
    selection = null;
    modal.style.display = 'none';
    game.state = 'playing';
    game.lastTime = performance.now();
    game.gamepadCombatInputLocked = true;
    onChoose(options[index]);
  }
  function navigate(direction) {
    if (!selection) return;
    const size = selection.options.length;
    selection.index = (selection.index + direction + size) % size;
    paint();
  }
  function pollGamepad(game, justPressed, gp) {
    if (!selection || selection.game !== game) return false;
    if (justPressed(14) || justPressed(12)) navigate(-1);
    if (justPressed(15) || justPressed(13)) navigate(1);
    const horizontal = gp?.axes?.[0] || 0;
    if (Math.abs(horizontal) > 0.55 && performance.now() > analogNavAt) {
      navigate(horizontal > 0 ? 1 : -1);
      analogNavAt = performance.now() + 260;
    }
    if (justPressed(0) || justPressed(9)) choose(selection.index);
    return true;
  }
  function update(game) {
    if (!game.endlessMode) {
      if (hud) hud.style.display = 'none';
      return;
    }
    ensure();
    const s = game.endlessState;
    const route = window.NeonRogueEndless?.getRoute(game);
    const event = window.NeonRogueEvents?.description(game);
    hud.textContent = `无尽 ${game.bossCycle} 阶段 · ${route?.name || '未知战区'} · 遗物 ${s?.relics?.length || 0} · 融合 ${s?.fusions?.length || 0}${event ? ' · ' + event : ''}`;
    hud.style.display = 'block';
  }
  window.addEventListener('keydown', e => {
    if (!selection) return;
    const left = ['ArrowLeft', 'a', 'A'].includes(e.key);
    const right = ['ArrowRight', 'd', 'D'].includes(e.key);
    const confirm = ['Enter', ' ', 'Spacebar'].includes(e.key);
    if (!left && !right && !confirm) return;
    // Suppress the same keystroke reaching the underlying combat controls.
    e.preventDefault();
    e.stopImmediatePropagation?.();
    if (left) navigate(-1);
    if (right) navigate(1);
    if (confirm) choose(selection.index);
  });
  window.NeonRogueUI = Object.freeze({ open, choose, navigate, pollGamepad, update, get active() { return Boolean(selection); } });
})();
