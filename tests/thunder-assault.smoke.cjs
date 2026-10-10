/* Run: node tests/thunder-assault.smoke.cjs
 * Canvas + DOM shims allow progression and drawing regression tests without a browser.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createCanvasContext() {
  const gradient = () => ({ addColorStop() {} });
  return new Proxy({ createLinearGradient: gradient, createRadialGradient: gradient }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string') return () => {};
      return undefined;
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}

const context2d = createCanvasContext();
const nodes = new Map();
function makeNode() {
  const classes = new Set();
  return {
    style: {}, dataset: {}, children: [],
    classList: {
      add(v) { classes.add(v); }, remove(v) { classes.delete(v); },
      contains(v) { return classes.has(v); },
      toggle(v, force) { if (force ?? !classes.has(v)) classes.add(v); else classes.delete(v); }
    },
    addEventListener() {},
    getContext() { return context2d; },
    appendChild(node) { this.children.push(node); },
    replaceChildren(...children) { this.children = children; },
    setAttribute() {},
    click() { this.onclick?.(); },
    innerHTML: '', textContent: ''
  };
}

const document = {
  readyState: 'complete',
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, makeNode());
    return nodes.get(id);
  },
  createElement: () => makeNode(),
  querySelectorAll: () => []
};
const window = { innerWidth: 960, innerHeight: 720, devicePixelRatio: 1,
  addEventListener() {} };
const sandbox = { window, document, navigator: {maxTouchPoints: 0, getGamepads: () => []},
  localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => 0 },
  requestAnimationFrame() {}, setTimeout(fn) { fn(); }, clearInterval() {}, setInterval() {},
  console, Math, Date };
sandbox.window.window = window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/Game/gamepad_haptics.js', 'utf8'), sandbox);
sandbox.GamepadHaptics = window.GamepadHaptics;
vm.runInContext(fs.readFileSync('public/Game/thunder_visuals.js', 'utf8'), sandbox);
sandbox.ThunderVisuals = window.ThunderVisuals;
const html = fs.readFileSync('public/Game/thunder_assault.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for (const match of scripts) if (match[1].trim()) vm.runInContext(match[1], sandbox);
const game = window.game;
assert.ok(game, 'Game must boot even without audio or local storage');

for (let ship = 0; ship < 3; ship++) {
  game.drawFighter(context2d, 200, 300, ship, 0, 1.2, true);
}
game.render();
game.startNewGame();
assert.equal(game.state, 'playing');
game.openManual();
assert.equal(game.state, 'paused', 'Manual must pause combat');
game.closeManual();
assert.equal(game.state, 'playing', 'Closing manual restores combat');
game.mouse.active = true;
game.mouse.x = 0;
game.mouse.y = 0;
game.keys.d = true;
const previousX = game.player.x;
game.update(0.016);
assert.ok(game.player.x > previousX, 'Keyboard movement should beat an idle mouse cursor');
game.keys.d = false;
game.mouse.active = false;

game.kills = 8;
game.updateWaveDirector(0.01);
assert.equal(game.wave, 2);
assert.equal(game.state, 'upgrade');
game.state = 'playing';
game.wave = 4;
game.waveStartKills = 100;
game.kills = 112;
game.enemies = [];
game.updateWaveDirector(0.01);
assert.equal(game.wave, 5, 'Fourth wave must transition to flagship wave');
game.state = 'playing';
game.updateWaveDirector(0.01);
assert.equal(game.boss.name, 'Iron Curtain', 'Wave 5 must spawn Iron Curtain');
game.render();
const ironHp = game.boss.hp;
game.triggerBomb();
assert.equal(game.boss.hp, ironHp - 400, 'Bombs must damage the flagship too');
game.boss.hp = game.boss.maxHp * 0.28;
game.update(0.016);
assert.equal(game.boss.phase, 3, 'Boss must transition into third phase');
game.boss.hp = 0;
game.update(0.016);
assert.equal(game.wave, 6, 'Defeating first boss must advance to wave 6');
assert.equal(game.state, 'upgrade', 'First boss grants new tactical upgrade');

game.startNewGame();
game.wave = 10;
game.waveStartKills = game.kills;
game.enemies = [];
game.updateWaveDirector(0.01);
assert.equal(game.boss.name, 'Void Leviathan', 'Wave 10 must spawn final boss');
game.player.hyperMeter = 100;
game.activateHyper();
assert.equal(game.player.isHyper, true, 'Full meter must enable manual Hyper');
game.boss.hp = 0;
game.update(0.016);
assert.equal(game.state, 'victory', 'Final boss defeat should settle victory');
assert.equal(game.boss, null, 'Victory must remove defeated boss');
game.render();
game.startNewGame();
assert.equal(game.state, 'playing', 'Victory should allow a fresh run');
assert.equal(game.boss, null, 'Restart should reset flagship state');

console.log('Thunder Assault smoke test passed: visual rendering, controls, waves, both bosses and victory.');
