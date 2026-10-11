/* Run: node tests/neon-survivor-settings.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const css = fs.readFileSync(root + 'css/game.css', 'utf8');
assert.match(html, /js\/settings\.js/);
for (const id of ['btn-settings', 'btn-start-settings', 'btn-pause-settings']) {
  assert.ok(html.includes('id="' + id + '"'), 'Missing settings entry ' + id);
}
assert.match(css, /neon-settings-card/);
assert.match(css, /max-width: 640px/);
assert.match(css, /--neon-dash-size/);

const saved = new Map();
const documentEvents = new Map();
const els = new Map();
class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = { setProperty(key, value) { this[key] = value; } };
    this.children = []; this.handlers = {};
    this.hidden = false; this.dataset = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(key, fn) { this.handlers[key] = fn; }
  setAttribute() {}
}
const doc = {
  readyState: 'loading', documentElement: new El('html'), body: new El('body'),
  createElement: tag => new El(tag),
  getElementById(id) {
    if (els.has(id)) return els.get(id);
    function find(node) {
      if (node?.id === id) return node;
      for (const child of node?.children || []) {
        const match = find(child); if (match) return match;
      }
      return null;
    }
    return find(this.body);
  },
  addEventListener(type, callback) { documentEvents.set(type, callback); }
};
for (const id of ['btn-settings','btn-start-settings','btn-pause-settings','btn-aim','btn-vibrate','btn-sound','crtOverlay']) {
  const el = new El('button'); el.id = id; els.set(id, el);
}
const game = {
  state: 'playing', settingsOpen: false, player: { autoAim: true },
  sound: { enabled: true, masterGain: { gain: { value: 0.28 } } },
  gamepadVibrationEnabled: true, dpr: 2,
  resize() { this.resizes = (this.resizes || 0) + 1; },
  releaseJoystickTouch() { this.released = true; }
};
const window = { game, devicePixelRatio: 2 };
const sandbox = {
  document: doc, window, localStorage: {
    getItem(key) { return saved.get(key) ?? null; },
    setItem(key, value) { saved.set(key, String(value)); }
  },
  console, performance: { now: () => 1000 }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + 'js/settings.js', 'utf8'), sandbox);
documentEvents.get('DOMContentLoaded')();
const settings = window.NeonGameSettings;
assert.equal(typeof settings.open, 'function');
settings.open(game);
assert.equal(game.state, 'paused', 'Settings pause active host / solo game');
assert.equal(game.settingsOpen, true);
assert.equal(game.released, true);
const overlay = doc.getElementById('neon-settings-modal');
assert.ok(overlay && !overlay.hidden);
for (const id of ['sound','autoAim','vibration','crt','lowEffects','dashSize','dashOpacity','joystickDeadzone','cameraZoom','playerName']) {
  assert.ok(doc.getElementById('neon-setting-' + id), 'Missing control ' + id);
}
for (const color of ['auto','cyan','amber','violet','mint','pink','gold']) {
  assert.ok(doc.getElementById('neon-setting-color-' + color), 'Missing paint color ' + color);
}
settings.set('sound', false, game);
assert.equal(game.sound.enabled, false);
assert.equal(game.sound.masterGain.gain.value, 0);
settings.set('autoAim', false, game);
assert.equal(game.player.autoAim, false);
settings.set('lowEffects', true, game);
assert.equal(game.fxLow, true);
assert.equal(game.dpr, 1.25);
assert.ok(game.resizes > 0);
settings.set('dashSize', 1000, game);
assert.equal(settings.get('dashSize'), 100);
assert.equal(doc.documentElement.style['--neon-dash-size'], '100px');
settings.set('joystickDeadzone', 22, game);
assert.equal(settings.get('joystickDeadzone'), 22);
settings.set('cameraZoom', 135, game);
assert.equal(settings.get('cameraZoom'), 135);
assert.equal(game.cameraZoom, 1.35);
assert.equal(JSON.parse(saved.get('neon_game_settings_v1')).cameraZoom, 135);
settings.set('playerName', ' 星海舰长<script>  ', game);
assert.equal(settings.get('playerName'), '星海舰长', 'Names must be sanitized');
settings.set('shipColor', 'violet', game);
assert.equal(settings.get('shipColor'), 'violet');
assert.equal(JSON.parse(saved.get('neon_game_settings_v1')).shipColor, 'violet');
settings.set('shipColor', 'unknown', game);
assert.equal(settings.get('shipColor'), 'auto');
settings.set('shipColor', 'mint', game);
settings.set('cameraZoom', 0, game);
assert.equal(game.cameraZoom, 0.65, 'Zoom must clamp to 65%');
settings.set('cameraZoom', 999, game);
assert.equal(game.cameraZoom, 1.5, 'Zoom must clamp to 150%');
settings.set('cameraZoom', 135, game);
assert.equal(JSON.parse(saved.get('neon_game_settings_v1')).lowEffects, true);
settings.close();
assert.equal(game.state, 'playing');
assert.equal(game.settingsOpen, false);
assert.equal(overlay.hidden, true);
game.state = 'lan-client';
settings.open(game);
assert.equal(game.state, 'lan-client', 'Guest settings must not start local combat simulation');
settings.close();
assert.equal(game.state, 'lan-client');
// Simulate a new game resetting its player: persisted settings apply again.
game.player = { autoAim: true };
game.cameraZoom = 1;
settings.apply(game);
assert.equal(game.cameraZoom, 1.35);
assert.equal(game.player.autoAim, false);
// A new page's settings initializer must deserialize the persisted zoom too.
const nextDocumentEvents = new Map();
const nextDoc = {
  ...doc, body: new El('body'),
  addEventListener(type, callback) { nextDocumentEvents.set(type, callback); }
};
const nextGame = { ...game, player: { autoAim: true }, cameraZoom: 1 };
const nextWindow = { game: nextGame, devicePixelRatio: 2 };
const nextSandbox = { ...sandbox, document: nextDoc, window: nextWindow };
vm.createContext(nextSandbox);
vm.runInContext(fs.readFileSync(root + 'js/settings.js', 'utf8'), nextSandbox);
nextDocumentEvents.get('DOMContentLoaded')();
assert.equal(nextGame.cameraZoom, 1.35, 'Zoom restores after reload');
assert.equal(nextWindow.NeonGameSettings.get('cameraZoom'), 135);
assert.equal(nextWindow.NeonGameSettings.get('shipColor'), 'mint');
assert.equal(nextWindow.NeonGameSettings.get('playerName'), '星海舰长');
console.log('Neon Survivor settings passed: mobile controls, persistent prefs, low graphics, guest isolation and pause/resume.');
