/* Run: node tools/neon-survivor/profile-phases.cjs
 *
 * Boots the real game in a Node DOM mock and reports where a late-game frame
 * actually spends its time. This exists so performance work is aimed at
 * measured hot spots instead of assumed ones: the earlier assumption that the
 * per-entity query loops dominate turned out to be wrong, and only a phase
 * profile can show that.
 *
 * The numbers are main-thread JS time for update() phases plus render(). They
 * are not a mobile GPU measurement, but they do rank the CPU work correctly.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const neonCore = require('../../tests/helpers/neon-core.cjs');

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
    getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }; }
  };
}
const nodeCache = new Map();
function cached(key) {
  if (!nodeCache.has(key)) nodeCache.set(key, element(key));
  return nodeCache.get(key);
}
// A concrete no-op 2D context. A Proxy would add a trap call to every property
// access and inflate the render number by roughly an order of magnitude, which
// would make the profile useless for ranking render against simulation.
function makeContext() {
  const noop = () => {};
  const ctx = {
    canvas: element('gameCanvas'),
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    font: '10px monospace', textAlign: 'left', lineCap: 'butt', lineJoin: 'miter',
    shadowBlur: 0, shadowColor: '#000', globalCompositeOperation: 'source-over',
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) })
  };
  for (const name of ['save', 'restore', 'clearRect', 'translate', 'scale', 'rotate',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect',
    'roundRect', 'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'clip',
    'fillText', 'strokeText', 'setLineDash', 'getLineDash', 'drawImage', 'setTransform',
    'resetTransform', 'transform', 'quadraticCurveTo', 'bezierCurveTo', 'putImageData',
    'createPattern', 'isPointInPath', 'getTransform']) ctx[name] = noop;
  return ctx;
}
const canvasCtx = makeContext();
const storage = new Map();
const winListeners = {};
const audioNode = { connect() {}, disconnect() {}, start() {}, stop() {} };
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });

const sandbox = {
  console, Math, JSON, Date, Object, Array, Number, String, Boolean, RegExp, Error,
  Promise, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, Uint8ClampedArray,
  Float32Array, isFinite, isNaN, parseInt, parseFloat, structuredClone,
  encodeURIComponent, decodeURIComponent, URL, URLSearchParams, TextEncoder, TextDecoder,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  performance: { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 },
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  devicePixelRatio: 2, innerWidth: 390, innerHeight: 844,
  location: { href: 'http://localhost/Game/neon-survivor/index.html', search: '', hash: '' },
  localStorage: {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  },
  navigator: { getGamepads: () => [], maxTouchPoints: 5, userAgent: 'node',
    clipboard: { writeText: async () => {} } },
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
    if (id === 'gameCanvas') { node.getContext = () => canvasCtx; node.width = 780; node.height = 1688; }
    return node;
  },
  createElement: tag => {
    const node = element();
    node.tagName = String(tag).toUpperCase();
    if (node.tagName === 'CANVAS') node.getContext = () => canvasCtx;
    return node;
  },
  querySelector: s => cached('sel:' + s),
  querySelectorAll: () => [],
  addEventListener: () => {}, removeEventListener() {},
  exitFullscreen: async () => {}, webkitExitFullscreen: async () => {}
};
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(neonCore.ROOT, '../gamepad_haptics.js'), 'utf8'),
  sandbox, { filename: 'Game/gamepad_haptics.js' });
for (const rel of neonCore.scriptPaths()) {
  vm.runInContext(fs.readFileSync(path.join(neonCore.ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
for (const handler of winListeners.DOMContentLoaded || []) handler();
const game = sandbox.window.game;

// --- build a dense late-game frame ---
game.startNewGame();
game.survivalTime = 15 * 60;           // 15 minutes in: endless-tier pressure
game.player.weapons = { blaster: 5, missiles: 5, tesla: 5, nova: 5, laser: 5, drones: 5, blackhole: 3, cryomine: 3 };
game.player.dmgMultiplier = 6;
game.player.level = 30;
const spawnRing = (count, radius, base) => {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const d = radius * (0.25 + Math.random() * 0.75);
    game.enemies.push({
      type: base.type, x: Math.cos(a) * d, y: Math.sin(a) * d,
      vx: 0, vy: 0, hp: base.hp, maxHp: base.hp, radius: base.radius,
      speed: base.speed, color: base.color, damage: base.damage, xpVal: base.xpVal
    });
  }
};
const refill = () => {
  if (game.enemies.length < 100) {
    spawnRing(100 - game.enemies.length, 700, { type: 'swarmer', hp: 400, radius: 12, speed: 235, color: '#ff0055', damage: 10, xpVal: 2 });
  }
  while (game.bullets.length < 220) {
    const a = Math.random() * Math.PI * 2;
    game.bullets.push({ type: 'blaster', x: Math.cos(a) * 300, y: Math.sin(a) * 300,
      vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, radius: 4.5, damage: 25, pierce: 2,
      color: '#00f3ff', life: 1.4 });
  }
  while (game.enemyBullets.length < 200) {
    const a = Math.random() * Math.PI * 2;
    game.enemyBullets.push({ x: Math.cos(a) * 500, y: Math.sin(a) * 500,
      vx: -Math.cos(a) * 240, vy: -Math.sin(a) * 240, radius: 6, color: '#ff007f', damage: 20, life: 3.5 });
  }
  while (game.gems.length < 300) {
    const a = Math.random() * Math.PI * 2;
    game.gems.push({ type: 'gem', x: Math.cos(a) * 600, y: Math.sin(a) * 600, radius: 5, color: '#00f3ff', value: 3 });
  }
};
refill();

// --- wrap the phases so each one is timed ---
const PHASES = ['dispatchPilotTicks', 'updateSpawning', 'applyPassiveRegen', 'decayScreenShake',
  'tickPlayerInvulnerability', 'updateDashAndMovement', 'updateAntiAfk', 'updateAegis', 'updateAutoAim',
  'updateCamera', 'updateWeapons', 'updateLaserBeams', 'updateCompanionDrones', 'updateBlackHoles',
  'updateCryoMines', 'updateDashTrails', 'updateBullets', 'updateEnemyProjectiles', 'updateEnemies',
  'updateLightningTetherDamage', 'updateGems', 'updateShockwaves', 'updateParticles',
  'updateFloatingTexts', 'cleanAndCompactGems', 'updateHUD', 'syncShipHudState'];
const totals = Object.create(null);
for (const phase of PHASES) {
  const original = game[phase];
  if (typeof original !== 'function') { totals[phase] = -1; continue; }
  totals[phase] = 0;
  game[phase] = function (...args) {
    const t0 = performance.now();
    const result = original.apply(this, args);
    totals[phase] += performance.now() - t0;
    return result;
  };
}
const originalRender = game.render;
let renderMs = 0;
game.render = function (...args) {
  const t0 = performance.now();
  const result = originalRender.apply(this, args);
  renderMs += performance.now() - t0;
  return result;
};

// Per-layer render breakdown: render() is the dominant phase, so knowing which
// layer owns it is what decides where the drawing work goes.
const LAYERS = ['renderCyberGrid', 'renderGems', 'renderShockwaves', 'renderParticles',
  'renderEnemies', 'renderLightningTethers', 'renderBlackHoles', 'renderCryoMines',
  'renderLaserBeams', 'renderCompanionDrones', 'renderEnemyBullets', 'renderBullets',
  'renderOrbiters', 'renderDashTrails', 'renderSlashFx', 'renderAegisAura',
  'renderFighter', 'renderFloatingTexts'];
const layerMs = Object.create(null);
for (const layer of LAYERS) {
  const original = game[layer];
  if (typeof original !== 'function') { layerMs[layer] = -1; continue; }
  layerMs[layer] = 0;
  game[layer] = function (...args) {
    const t0 = performance.now();
    const result = original.apply(this, args);
    layerMs[layer] += performance.now() - t0;
    return result;
  };
}

const FRAMES = 600;
const t0 = performance.now();
for (let frame = 0; frame < FRAMES; frame++) {
  refill();
  game.update(1 / 60);
  game.render();
}
const wall = performance.now() - t0;

const rows = Object.entries(totals)
  .filter(([, ms]) => ms > 0)
  .map(([name, ms]) => ({ name, ms: ms / FRAMES }))
  .sort((a, b) => b.ms - a.ms);
const renderPerFrame = renderMs / FRAMES;
const total = rows.reduce((sum, row) => sum + row.ms, 0) + renderPerFrame;

console.log(`${FRAMES} frames, ${(wall / FRAMES).toFixed(2)}ms/frame wall`);
console.log(`enemies ${game.enemies.length} bullets ${game.bullets.length} ` +
  `enemyBullets ${game.enemyBullets.length} gems ${game.gems.length} ` +
  `particles ${game.particles.length} texts ${game.texts.length}`);
console.log('');
console.log('phase                        ms/frame   share');
for (const row of rows) {
  console.log(row.name.padEnd(28) + row.ms.toFixed(3).padStart(8) +
    (100 * row.ms / total).toFixed(1).padStart(8) + '%');
}
console.log('render'.padEnd(28) + renderPerFrame.toFixed(3).padStart(8) +
  (100 * renderPerFrame / total).toFixed(1).padStart(8) + '%');
console.log(''.padEnd(28, '-'));
console.log('total'.padEnd(28) + total.toFixed(3).padStart(8));

console.log('');
console.log('render layer                 ms/frame   share of render');
const layerRows = Object.entries(layerMs)
  .filter(([, ms]) => ms > 0)
  .map(([name, ms]) => ({ name, ms: ms / FRAMES }))
  .sort((a, b) => b.ms - a.ms);
for (const row of layerRows) {
  console.log(row.name.padEnd(28) + row.ms.toFixed(3).padStart(8) +
    (100 * row.ms / renderPerFrame).toFixed(1).padStart(16) + '%');
}
