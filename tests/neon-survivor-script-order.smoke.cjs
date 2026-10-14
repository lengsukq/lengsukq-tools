/* Run: node tests/neon-survivor-script-order.smoke.cjs
 *
 * The game is 69 classic <script> tags with no module system, so index.html's
 * order IS the dependency graph. The Node gameplay tests each load a hand-picked
 * subset, which cannot catch:
 *   - a duplicate top-level `const`/`class` between two core files
 *   - a core file loaded before the file that defines what it needs
 *   - a script tag that throws on load
 * This test loads every script in index.html order into ONE context — what a
 * browser actually does — then boots the game and runs real frames.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

function element(id = '') {
  return {
    id, tagName: 'DIV', style: { setProperty() {}, removeProperty() {} },
    dataset: {}, children: [], textContent: '', innerHTML: '', title: '', value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren() {}, append() {}, remove() {}, insertBefore() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return cached('sel:' + arguments[0]); },
    querySelectorAll() { return []; },
    closest() { return null; }, focus() {}, blur() {}, click() {},
    scrollIntoView() {}, setPointerCapture() {}, releasePointerCapture() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
    }
  };
}

// The game writes into containers it looks up repeatedly; hand back the same
// node for the same key so those writes accumulate like a real DOM.
const nodeCache = new Map();
function cached(key) {
  if (!nodeCache.has(key)) nodeCache.set(key, element(key));
  return nodeCache.get(key);
}

const canvasCtx = new Proxy({}, {
  get: (_target, key) => {
    if (key === 'canvas') return element('gameCanvas');
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') {
      return () => ({ addColorStop() {} });
    }
    if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return () => {};
  },
  set: () => true
});

const storage = new Map();
const docListeners = {};
const winListeners = {};
const audioNode = { connect() {}, disconnect() {}, start() {}, stop() {} };
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });

const sandbox = {
  console, Math, JSON, Date, Object, Array, Number, String, Boolean, RegExp, Error,
  Promise, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, Uint8ClampedArray,
  Float32Array, isFinite, isNaN, parseInt, parseFloat, structuredClone,
  encodeURIComponent, decodeURIComponent, URL, URLSearchParams, TextEncoder, TextDecoder,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  location: { href: 'http://localhost/Game/neon-survivor/index.html', search: '', hash: '' },
  localStorage: {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  },
  navigator: {
    getGamepads: () => [], maxTouchPoints: 0, userAgent: 'node',
    clipboard: { writeText: async () => {} }
  },
  AudioContext: function AudioContext() {
    return {
      currentTime: 0, sampleRate: 44100, destination: audioNode,
      createGain: () => ({ ...audioNode, gain: param() }),
      createOscillator: () => ({ ...audioNode, type: '', frequency: param() }),
      createBuffer: () => ({ getChannelData: () => new Float32Array(8) }),
      createBufferSource: () => ({ ...audioNode, buffer: null }),
      createBiquadFilter: () => ({ ...audioNode, type: '', frequency: param() })
    };
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.addEventListener = (type, fn) => { (winListeners[type] ||= []).push(fn); };
sandbox.removeEventListener = () => {};
sandbox.document = {
  documentElement: element('html'), head: element('head'), body: element('body'),
  fullscreenElement: null, webkitFullscreenElement: null,
  getElementById: id => {
    const node = cached('id:' + id);
    if (id === 'gameCanvas') {
      node.getContext = () => canvasCtx;
      node.width = 1280;
      node.height = 800;
    }
    return node;
  },
  createElement: tag => {
    const node = element();
    node.tagName = String(tag).toUpperCase();
    if (node.tagName === 'CANVAS') node.getContext = () => canvasCtx;
    return node;
  },
  querySelector: selector => cached('sel:' + selector),
  querySelectorAll: () => [],
  addEventListener: (type, fn) => { (docListeners[type] ||= []).push(fn); },
  removeEventListener() {},
  exitFullscreen: async () => {}, webkitExitFullscreen: async () => {}
};
vm.createContext(sandbox);

// --- load every script in index.html order, exactly like a browser ---
// index.html loads the shared rumble helper from /Game/ before the game itself.
const shared = path.join(neonCore.ROOT, '../gamepad_haptics.js');
assert.ok(fs.existsSync(shared), 'the shared gamepad_haptics.js must exist');
vm.runInContext(fs.readFileSync(shared, 'utf8'), sandbox, { filename: 'Game/gamepad_haptics.js' });

const scripts = neonCore.scriptPaths();
assert.ok(scripts.length > 60, `expected the full script list, got ${scripts.length}`);
const failures = [];
for (const relative of scripts) {
  try {
    vm.runInContext(fs.readFileSync(path.join(neonCore.ROOT, relative), 'utf8'), sandbox,
      { filename: relative });
  } catch (error) {
    failures.push(`${relative}: ${error.message}`);
  }
}
assert.deepEqual(failures, [], 'every script index.html loads must evaluate cleanly');

// --- the modules the page depends on registered themselves ---
for (const name of ['NeonShips', 'NeonPlayers', 'NeonGameSettings', 'NeonRogueEndless',
  'NeonLanCoop', 'NeonUpgradeRarity', 'NeonWeaponSystem']) {
  assert.ok(sandbox.window[name], `window.${name} must be registered after load`);
}
assert.equal(vm.runInContext('typeof NeonSurvivorGame', sandbox), 'function');

// --- boot the game through the real DOMContentLoaded handler ---
for (const handler of winListeners.DOMContentLoaded || []) handler();
const game = sandbox.window.game;
assert.ok(game, 'boot.js must construct window.game on DOMContentLoaded');
assert.equal(game.state, 'start');

// --- run real frames: update, render, and the combat entry points ---
game.startNewGame();
assert.equal(game.state, 'playing');
for (let frame = 0; frame < 240; frame++) {
  game.update(1 / 60);
  game.render();
}
assert.ok(game.survivalTime > 3.9 && game.survivalTime < 4.1,
  `four simulated seconds expected, got ${game.survivalTime}`);
assert.ok(Number.isFinite(game.player.x) && Number.isFinite(game.player.y),
  'the player must stay at finite coordinates');

// --- pause/resume round trip ---
game.pauseGame();
assert.equal(game.state, 'paused');
game.resumeGame();
assert.equal(game.state, 'playing');

// --- combat entry points, HUD writes and the level-up flow ---
game.triggerDash();
assert.ok(game.player.invulnTimer >= 0, 'a dash must grant protection frames');
game.renderWeaponsHUD();
game.updateHUD();

// Exactly one level so a single confirm returns to combat; large XP grants queue
// several level-ups, which is covered by the dedicated upgrade tests.
game.gainXP(game.player.xpNeeded);
assert.equal(game.state, 'levelup', 'enough XP must open the level-up panel');
assert.equal(game.player.level, 2);
assert.ok(game.upgradeGrid && game.currentUpgradeChoices.length > 0,
  'the level-up panel must offer upgrade cards');
const picked = game.currentUpgradeChoices[0];
game.selectUpgradePreview(picked);
game.confirmUpgradePreview();
assert.equal(game.state, 'playing', 'confirming an upgrade must resume combat');

// Every runtime sub-method extracted from update()/render() must be reachable.
for (const name of ['updateEnemies', 'updateBullets', 'updateGems', 'renderEnemies',
  'renderBullets', 'renderGems', 'updateDashAndMovement', 'updateCamera',
  'updateWeapons', 'updateAegis', 'renderAegisAura', 'renderDashTrails']) {
  assert.equal(typeof game[name], 'function', `${name} must exist on the prototype`);
}

// Dead spell-cycling aliases removed by the core split must not come back: J/K
// and X/Y cast the two Astra spells directly, so nothing can reach them.
for (const name of ['cycleAstraSpell', 'castAstraSpell', 'triggerPhantomStrike',
  'triggerPhantomReap', 'triggerPhantomSurge']) {
  assert.equal(game[name], undefined, `${name} is dead code and must stay removed`);
}
assert.equal(game.selectedAstraSpell, undefined, 'selectedAstraSpell is dead state');

console.log(`Script order passed: ${scripts.length} scripts load in browser order, `
  + 'boot + 240 frames + pause/dash/HUD/level-up verified.');
