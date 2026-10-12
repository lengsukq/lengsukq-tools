/* Controller prompts are presentation only, and never imply input ownership.
 * The class is enabled exclusively while an actual Gamepad API pad exists.
 */
(() => {
  'use strict';
  let connected = false;
  let layout = 'xbox';
  function mapLayout(pad) {
    const name = String(pad?.id || '').toLowerCase();
    if (/playstation|dualsense|dualshock|sony|wireless controller/.test(name)) return 'ps';
    if (/switch|joy.con|nintendo|pro controller/.test(name)) return 'switch';
    return 'xbox';
  }
  const KEYS = Object.freeze({
    xbox: { a:'A', b:'B', x:'X', y:'Y', rt:'RT', lt:'LT', lb:'LB', rb:'RB', start:'Menu', ls:'LS', dpad:'十字键' },
    ps: { a:'×', b:'○', x:'□', y:'△', rt:'R2', lt:'L2', lb:'L1', rb:'R1', start:'Options', ls:'左摇杆', dpad:'十字键' },
    switch: { a:'B', b:'A', x:'Y', y:'X', rt:'ZR', lt:'ZL', lb:'L', rb:'R', start:'+', ls:'左摇杆', dpad:'十字键' }
  });
  function label(key) { return KEYS[layout]?.[key] || KEYS.xbox[key] || key; }
  function sync(pad) {
    const next = Boolean(pad && pad.connected !== false);
    const nextLayout = next ? mapLayout(pad) : 'xbox';
    if (connected === next && layout === nextLayout) return;
    connected = next;
    layout = nextLayout;
    document.documentElement?.classList?.toggle('neon-gamepad-connected', connected);
    // Keep native buttons usable without gamepads and never steal their clicks.
    document.querySelectorAll?.('[data-gamepad-action]').forEach(element => {
      const shortcut = element.getAttribute('data-gamepad-action');
      const name = label(shortcut);
      element.setAttribute('data-gamepad-key', name);
    });
    document.querySelectorAll?.('[data-gamepad-symbol]').forEach(element => {
      element.textContent = label(element.getAttribute('data-gamepad-symbol'));
    });
    document.querySelectorAll?.('[data-pad-input]').forEach(element => {
      element.setAttribute('data-pad-label', label(element.getAttribute('data-pad-input')));
    });
  }
  function prompt(text, key) {
    const node = document.createElement('span');
    node.className = 'neon-gamepad-prompt';
    node.append(keyBadge(key), document.createTextNode(text));
    return node;
  }
  function keyBadge(key) {
    const badge = document.createElement('kbd');
    badge.className = 'neon-gamepad-key';
    badge.setAttribute?.('data-gamepad-symbol', key);
    badge.textContent = label(key);
    return badge;
  }
  window.NeonGamepadHints = Object.freeze({
    sync, label, prompt, keyBadge,
    get connected() { return connected; }
  });
})();
