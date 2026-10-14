/* Run: node tests/neon-survivor-touch.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const html = fs.readFileSync('public/Game/neon-survivor/index.html', 'utf8');
const listeners = {};
const window = {
  ontouchstart: null,
  addEventListener(type, callback) {
    (listeners[type] ||= []).push(callback);
  }
};
const domEvents = {};
function element(id) {
  return {
    id, style: {}, addEventListener(type, callback) {
      (domEvents[`${id}:${type}`] ||= []).push(callback);
    },
    getBoundingClientRect() {
      return { left: 760, right: 860, top: 400, bottom: 520 };
    }
  };
}
const elements = Object.fromEntries(
  ['touch-controls', 'joystickBase', 'joystickThumb', 'touch-dash-btn']
    .map(id => [id, element(id)])
);
const sandbox = {
  window,
  document: { getElementById(id) { return elements[id] ?? null; } },
  navigator: { getGamepads: () => [] },
  localStorage: { getItem: () => null, setItem() {} },
  console, performance: { now: () => 1000 },
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runCore(sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const game = Object.create(proto);
game.state = 'playing';
game.survivalTime = 5;
game.keys = {};
game.touch = { active: false, identifier: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };
game.player = {
  x: 0, y: 0, radius: 16, dashCharges: 3, isDashing: false,
  invulnTimer: 0, dashDuration: 0.18, dashInvulnBonus: 0,
  hasAegis: false, aimAngle: 0, dashCombo: 0
};
game.sound = { playDash() {} };
game.shockwaves = [];
game.gamepadIndex = -1;
game.gamepadVibrationEnabled = false;
game.setupTouchControls();

function finger(identifier, x, y) {
  return { identifier, clientX: x, clientY: y };
}
const canvas = { closest: () => null };
const hud = { closest: () => ({ id: 'hud' }) };
function emit(type, changedTouches, target = canvas) {
  const event = {
    changedTouches, target, cancelable: true, canceled: false, propagationStopped: false,
    preventDefault() { this.canceled = true; },
    stopPropagation() { this.propagationStopped = true; }
  };
  if (type === 'touchstart' && target === elements['touch-dash-btn']) {
    for (const callback of domEvents['touch-dash-btn:touchstart'] || []) callback(event);
  }
  if (!event.propagationStopped) {
    for (const callback of listeners[type] || []) callback(event);
  }
  return event;
}

const move = finger(11, 80, 470);
const dash = finger(22, 800, 450);
assert.equal(elements['touch-controls'].style.display, 'block');
emit('touchstart', [move]);
assert.equal(game.touch.active, true);
assert.equal(game.touch.identifier, 11);
emit('touchmove', [finger(11, 130, 470)]);
assert.equal(game.touch.currentX, 130);
assert.equal(elements.joystickBase.style.display, 'block');

// Right thumb presses dash while left thumb remains on joystick.
const pressed = emit('touchstart', [dash], elements['touch-dash-btn']);
assert.equal(pressed.canceled, true);
assert.equal(game.player.dashCharges, 2, 'Dash should still fire on press');
assert.equal(game.player.dashDir.x, 1, 'Dash follows the left finger direction');
assert.equal(game.player.dashDir.y, 0);
assert.equal(game.touch.identifier, 11, 'Right thumb must not steal joystick ownership');
emit('touchmove', [finger(22, 820, 440)]);
assert.equal(game.touch.currentX, 130, 'Right thumb movement must not steer');
emit('touchend', [dash]);
assert.equal(game.touch.active, true, 'Lifting dash must not stop movement');
assert.equal(elements.joystickBase.style.display, 'block');
emit('touchmove', [finger(11, 80, 410)]);
assert.equal(game.touch.currentY, 410, 'Left thumb must still steer after dash release');
assert.equal(game.touch.currentX, 80);
emit('touchend', [finger(33, 500, 300)]);
assert.equal(game.touch.active, true, 'Unrelated touchend must be ignored');
emit('touchcancel', [finger(11, 80, 410)]);
assert.equal(game.touch.active, false, 'Only the owner ending/canceling releases the joystick');
assert.equal(game.touch.identifier, null);
assert.equal(elements.joystickBase.style.display, 'none');

// Reversed touch order: dash pressed first, then the moving finger is placed.
game.player.isDashing = false;
emit('touchstart', [dash], elements['touch-dash-btn']);
assert.equal(game.touch.active, false);
emit('touchstart', [move]);
assert.equal(game.touch.identifier, 11);
emit('touchend', [dash]);
assert.equal(game.touch.active, true);
emit('touchend', [move]);
assert.equal(game.touch.active, false);

// The start screen and HUD must not activate the movement joystick.
emit('touchstart', [finger(44, 200, 40)], hud);
assert.equal(game.touch.active, false);
game.state = 'paused';
emit('touchstart', [move]);
assert.equal(game.touch.active, false);
game.state = 'playing';
emit('touchstart', [move]);
assert.equal(game.touch.active, true);
game.releaseJoystickTouch();
assert.equal(game.touch.active, false);
assert.equal(elements.joystickBase.style.display, 'none');

console.log('Neon Survivor touch smoke test passed: simultaneous movement/dash, touch ownership, canceled fingers and UI isolation.');
