/* Shared controller navigation for DOM menus. Combat and upgrade input remain
 * owned by their respective state machines; no synthetic keyboard events. */
(() => {
  'use strict';
  let root = null;
  let selected = null;
  let repeatAt = 0;

  const SCOPES = [
    ['settings', '#neon-settings-modal'],
    ['lobby', '.neon-lan-lobby'],
    ['help', '#modal-help'],
    ['pause', '#modal-pause'],
    ['start', '#modal-start'],
    ['over', '#modal-gameover'],
    ['victory', '#modal-victory']
  ];
  const CONTROLS = 'button, input, select, textarea, summary, a[href]';

  // Keep directional input aligned with the 1/2/3-column responsive CSS grid.
  function columnsFor(element) {
    if (!element || typeof getComputedStyle !== 'function') return 3;
    const columns = getComputedStyle(element).gridTemplateColumns;
    return columns && columns !== 'none'
      ? Math.max(1, Math.min(3, columns.trim().split(/\s+/).length)) : 3;
  }
  function gridMove(index, count, dx = 0, dy = 0, columns = 3) {
    if (!count) return 0;
    const from = Math.max(0, Math.min(count - 1, index || 0));
    const cols = Math.max(1, Math.min(3, Math.floor(columns) || 3));
    const row = Math.floor(from / cols), col = from % cols;
    if (dy) {
      const rows = Math.ceil(count / cols);
      const nextRow = (row + Math.sign(dy) + rows) % rows;
      return Math.min(count - 1, nextRow * cols + col);
    }
    if (dx) {
      const first = row * cols;
      const len = Math.min(cols, count - first);
      return first + (col + Math.sign(dx) + len) % len;
    }
    return from;
  }

  function visible(node) {
    if (!node || node.disabled || node.hidden || node.closest?.('[hidden]')) return false;
    if (node.closest?.('.help-section:not(.active)')) return false;
    return true;
  }
  function current(game) {
    for (const [name, selector] of SCOPES) {
      if (name === 'settings' && !game.settingsOpen) continue;
      if (name === 'lobby' && game.state !== 'lan-lobby') continue;
      if (name === 'help' && !game.isHelpOpen) continue;
      if (name === 'pause' && game.state !== 'paused') continue;
      const element = document.querySelector?.(selector);
      if (!element || !visible(element)) continue;
      if (['help', 'pause', 'start', 'over', 'victory'].includes(name) &&
          !element.classList?.contains('active')) continue;
      return { name, element };
    }
    return null;
  }
  function items(element) {
    return Array.from(element.querySelectorAll?.(CONTROLS) || []).filter(visible);
  }
  function focus(node) {
    if (selected !== node) selected?.classList?.remove('neon-gamepad-menu-focus');
    selected = node;
    selected?.classList?.add('neon-gamepad-menu-focus');
    selected?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  function hints(scope) {
    if (scope.element.querySelector?.('.neon-menu-pad-legend')) return;
    const hint = window.NeonGamepadHints;
    if (!hint || !scope.element.appendChild) return;
    const legend = document.createElement('div');
    legend.className = 'neon-gamepad-hint-row neon-menu-pad-legend';
    const descriptions = scope.name === 'start'
      ? [['切换战舰', 'lb'], ['选择/出击', 'a'], ['说明', 'x'], ['设置', 'y']]
      : scope.name === 'help'
        ? [['切换/滚动', 'dpad'], ['选择', 'a'], ['返回', 'b']]
        : [['移动焦点', 'dpad'], ['选择/修改', 'a'], ['返回', 'b']];
    legend.append(...descriptions.map(([text, key]) => hint.prompt(text, key)));
    scope.element.querySelector?.('.modal-card, .neon-settings-card, .neon-lan-card')?.appendChild(legend) ||
      scope.element.appendChild(legend);
  }
  function step(game, scope, direction) {
    const controls = items(scope.element);
    if (!controls.length) return;
    const index = controls.indexOf(selected);
    focus(controls[(index + direction + controls.length) % controls.length]);
  }
  function adjust(direction) {
    if (!selected) return false;
    if (selected.tagName === 'SELECT') {
      const options = Array.from(selected.options || []).filter(option => !option.disabled);
      const i = options.findIndex(option => option.value === selected.value);
      const next = options[Math.max(0, Math.min(options.length - 1, i + direction))];
      if (!next) return true;
      selected.value = next.value;
      selected.dispatchEvent?.(new Event('change', { bubbles: true }));
      return true;
    }
    if (selected.type === 'range') {
      const min = Number(selected.min || 0);
      const max = Number(selected.max || 100);
      const step = Number(selected.step || 1);
      selected.value = String(Math.max(min, Math.min(max, Number(selected.value) + direction * step)));
      selected.dispatchEvent?.(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }
  function cycleShip(game, delta) {
    const ships = (window.NeonShips?.list(false) || []).filter(ship => ship.playable);
    if (ships.length < 2) return;
    const index = Math.max(0, ships.findIndex(ship => ship.id === game.selectedShipId));
    game.selectedShipId = ships[(index + delta + ships.length) % ships.length].id;
    window.NeonShipSelection?.render(game);
  }
  function back(game, name) {
    if (name === 'settings') window.NeonGameSettings?.close();
    else if (name === 'help') game.closeHelpModal?.();
    else if (name === 'pause') game.resumeGame?.();
    else if (name === 'lobby') {
      root.querySelector?.('#neon-lan-back')?.click();
    } else if (name === 'over' || name === 'victory') game.showStartMenu?.();
  }
  function poll(game, gp, justPressed) {
    const scope = current(game);
    if (!scope) { focus(null); root = null; return false; }
    if (root !== scope.element) {
      focus(null);
      root = scope.element;
      repeatAt = 0;
      const preferred = {
        start: '#btn-start-game', pause: '#btn-resume', help: '.help-tab-btn.active',
        over: '#btn-quick-over', victory: '#btn-endless', settings: '.neon-settings-close'
      }[scope.name];
      focus((preferred && root.querySelector?.(preferred)) || items(root)[0] || null);
      hints(scope);
    }
    // Re-rendered controls (ship cards and lobby) must not retain stale focus.
    if (!items(root).includes(selected)) focus(items(root)[0] || null);
    if (justPressed(1)) { back(game, scope.name); return true; }
    if (scope.name === 'pause' && justPressed(9)) { game.resumeGame?.(); return true; }
    if (scope.name === 'help' && justPressed(9)) { game.closeHelpModal?.(); return true; }
    if (scope.name === 'start') {
      if (justPressed(4)) cycleShip(game, -1);
      if (justPressed(5)) cycleShip(game, 1);
      if (justPressed(14)) {
        if (!adjust(-1)) game.selectDifficulty?.(Math.max(0, game.selectedDifficulty - 1));
      }
      if (justPressed(15)) {
        if (!adjust(1)) game.selectDifficulty?.(Math.min(game.unlockedDifficulty, game.selectedDifficulty + 1));
      }
      if (justPressed(2)) game.openHelpModal?.();
      if (justPressed(3)) window.NeonGameSettings?.open(game);
    }
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const ax = gp.axes?.[0] || 0, ay = gp.axes?.[1] || 0;
    const horizontal = (justPressed(14) ? -1 : justPressed(15) ? 1 :
      Math.abs(ax) > .55 && now >= repeatAt ? Math.sign(ax) : 0);
    const vertical = (justPressed(12) ? -1 : justPressed(13) ? 1 :
      Math.abs(ay) > .55 && now >= repeatAt ? Math.sign(ay) : 0);
    if (scope.name !== 'start' && horizontal && !adjust(horizontal)) {
      step(game, scope, horizontal);
      repeatAt = now + 200;
    }
    if (vertical) {
      step(game, scope, vertical);
      repeatAt = now + 200;
    }
    if (justPressed(0)) {
      if (selected?.tagName === 'INPUT' && selected.type === 'text') selected.focus?.();
      else if (selected?.tagName === 'TEXTAREA') selected.focus?.();
      else if (selected?.tagName === 'SELECT' || selected?.type === 'range') selected.focus?.();
      else selected?.click?.();
    }
    if (scope.name === 'start' && justPressed(9)) document.getElementById('btn-lan-coop')?.click();
    return true;
  }
  window.NeonGamepadMenus = Object.freeze({ poll, gridMove, columnsFor, get selected() { return selected; } });
})();
