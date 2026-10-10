/* Run: node tests/neon-survivor.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/Game/neon_survivor.html', 'utf8');
assert.match(html, /id="btn-test-vibrate"/);
assert.match(html, /id="btn-fullscreen"/);
assert.match(html, /src="\/Game\/gamepad_haptics\.js"/);

const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {
    id, style: {}, textContent: '', title: '', classList: {add() {}, remove() {}, contains() { return false; }},
    setAttribute(k,v) { this[k] = v; }, addEventListener() {}
  });
  return nodes.get(id);
}

const listeners = {};
const connected = [];
const document = {
  fullscreenElement: null,
  getElementById: node,
  querySelectorAll() { return []; },
  addEventListener(type, cb) { listeners[`document.${type}`] = cb; },
  documentElement: {async requestFullscreen() {
    document.fullscreenElement = this;
    listeners['document.fullscreenchange']?.();
  }},
  async exitFullscreen() {
    this.fullscreenElement = null;
    listeners['document.fullscreenchange']?.();
  }
};
const window = {addEventListener(type, cb) { listeners[type] = cb; }};
const sandbox = {
  window, document, navigator: {getGamepads: () => connected},
  localStorage: {getItem: () => null, setItem() {}},
  performance: {now: () => 1}, console, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/Game/gamepad_haptics.js', 'utf8'), sandbox);
sandbox.GamepadHaptics = window.GamepadHaptics;
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for (const match of scripts) if (match[1].trim()) vm.runInContext(match[1], sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const game = Object.create(proto);
Object.assign(game, {
  state: 'playing', gamepadVibrationEnabled: true, texts: [],
  width: 900, height: 650, player: {x: 100,y: 150},
  gamepadIndex: -1, gamepadMove: {x: 0, y: 0}
});

(async () => {
  game.setupGamepad();
  const gp = {index: 0, connected: true, buttons: [], axes: [],
    vibrationActuator: {playEffect() { return Promise.resolve('complete'); }} };
  connected.push(gp);
  listeners.gamepadconnected({gamepad: gp});
  assert.equal(game.gamepadIndex, 0);
  assert.equal(node('btn-test-vibrate').style.display, 'inline-flex');
  assert.equal((await game.testGamepadVibration()).status, 'accepted');
  assert.match(node('gamepad-name').textContent, /接受震动请求/);
  assert.equal(node('btn-fullscreen').textContent, '', 'Unbound button has not yet changed');
  await game.toggleFullscreen();
  assert.ok(document.fullscreenElement);
  assert.equal(node('btn-fullscreen').title, '退出全屏 (F)');
  await game.toggleFullscreen();
  assert.equal(document.fullscreenElement, null);
  assert.equal(node('btn-fullscreen').title, '进入全屏 (F)');
  listeners.gamepaddisconnected({gamepad:gp});
  assert.equal(node('btn-test-vibrate').style.display, 'none');
  connected.length = 0;
  assert.equal((await game.testGamepadVibration()).status, 'disconnected');

  // Regression: A confirms an upgrade, not a simultaneous gameplay dash.
  connected.push(gp);
  game.gamepadIndex = 0;
  game.player.autoAim = true;
  game.sound = { playLaser() {} };
  game.state = 'levelup';
  game.gamepadPrevButtons = {};
  game.gamepadCombatInputLocked = false;
  game.gamepadSelectedUpgradeIdx = 0;
  game.gamepadNavTimer = 0;
  let upgradeCount = 0;
  let dashCount = 0;
  const upgradeCard = { style: {}, click() { upgradeCount++; game.state = 'playing'; } };
  document.querySelectorAll = selector => selector === '#upgrade-options .upgrade-card' ? [upgradeCard] : [];
  game.triggerDash = () => { dashCount++; };
  gp.buttons = Array.from({length: 17}, () => ({pressed: false}));
  gp.buttons[0].pressed = true;
  game.pollGamepad(0.016);
  assert.equal(upgradeCount, 1, 'A must confirm exactly one upgrade');
  assert.equal(dashCount, 0, 'Confirming the upgrade must not trigger a dash');
  game.pollGamepad(0.016);
  assert.equal(dashCount, 0, 'Holding A after confirmation must not trigger a dash');
  gp.buttons[0].pressed = false;
  game.pollGamepad(0.016);
  assert.equal(dashCount, 0, 'Releasing confirmation must not trigger a dash');
  gp.buttons[0].pressed = true;
  game.pollGamepad(0.016);
  assert.equal(dashCount, 1, 'A should work for gameplay after a fresh press');

  console.log('Neon Survivor smoke test passed: rumble, fullscreen, disconnect and upgrade A input isolation.');
})().catch(e => {console.error(e); process.exitCode = 1;});
