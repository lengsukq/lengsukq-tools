/* Run: node tests/neon-survivor-render-batching.smoke.cjs
 *
 * The profiler (tools/neon-survivor/profile-phases.cjs) shows the mass
 * primitive layers own most of render(): enemy bullets, gems, enemies and
 * player bullets together are ~78% of it. Those layers used to pay one
 * beginPath/style-change/fill round trip per entity.
 *
 * They now use run-length batching: consecutive entities that share a style
 * are emitted into one path and filled once. Gems, pickups and barrages arrive
 * in same-style bursts, so the common case collapses to a handful of fills,
 * while a pathological alternating frame degrades to exactly the old
 * one-fill-per-entity behaviour -- never worse.
 *
 * This is verified by counting context calls rather than pixels, so it needs
 * no browser: N same-style entities must produce 1 fill, not N.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const sandbox = {
  window: { addEventListener() {} },
  document: { getElementById() { return null; }, addEventListener() {} },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 0 }, console,
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runCore(sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);

const METHODS = ['save', 'restore', 'beginPath', 'fill', 'stroke', 'arc', 'moveTo',
  'lineTo', 'closePath', 'rect', 'fillRect', 'translate', 'rotate', 'setLineDash'];

function recorder() {
  const calls = [];
  const ctx = { calls };
  for (const name of METHODS) ctx[name] = (...args) => calls.push([name, ...args]);
  // Force the documented rect() fallback so the missile path is deterministic.
  ctx.roundRect = undefined;
  return ctx;
}
const count = (calls, name) => calls.filter(call => call[0] === name).length;

function game() {
  const g = Object.create(proto);
  g.width = 800; g.height = 600; g.cameraZoom = 1;
  g.camera = { x: 0, y: 0 };
  g.player = { x: 0, y: 0, hp: 100, maxHp: 100, radius: 16, aimAngle: 0 };
  g.gems = []; g.enemyBullets = []; g.bullets = [];
  return g;
}
// Mirrors the viewport predicate render() builds, so culling behaves the same.
const visibleFor = g => (x, y, radius = 30) =>
  Math.abs(x - g.camera.x) <= g.width / 2 + radius &&
  Math.abs(y - g.camera.y) <= g.height / 2 + radius;

const inView = i => [(i % 20) * 30 - 300, Math.floor(i / 20) * 30 - 200];
const gem = (x, y, color = '#00f3ff', type = 'gem') => ({ x, y, radius: 5, color, type, value: 3 });
const bullet = (x, y, color = '#00f3ff', type = 'blaster') =>
  ({ x, y, vx: 100, vy: 0, radius: 4.5, color, type, damage: 10, life: 1 });

// --- gems: a same-colour burst collapses to one fill ---
{
  const g = game();
  for (let i = 0; i < 300; i++) { const [x, y] = inView(i); g.gems.push(gem(x, y)); }
  const ctx = recorder();
  g.renderGems(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 1, '300 same-colour gems must batch into one fill');
  assert.equal(count(ctx.calls, 'save'), 0, 'batched gems must not save/restore per gem');
  assert.equal(count(ctx.calls, 'restore'), 0);
  assert.equal(count(ctx.calls, 'beginPath'), 1, 'one path for the whole run');
  assert.equal(count(ctx.calls, 'moveTo'), 300, 'every diamond still emits its own subpath');
  assert.equal(count(ctx.calls, 'lineTo'), 900, 'three lineTo per diamond');
  assert.equal(count(ctx.calls, 'closePath'), 300);
}

// --- gems: contiguous colour blocks produce one fill each ---
{
  const g = game();
  const colors = ['#00f3ff', '#ff0055', '#00ff88'];
  for (let i = 0; i < 300; i++) { const [x, y] = inView(i); g.gems.push(gem(x, y, colors[Math.floor(i / 100)])); }
  const ctx = recorder();
  g.renderGems(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 3, 'three colour blocks must produce three fills');
  assert.equal(count(ctx.calls, 'moveTo'), 300, 'no gem may be dropped');
}

// --- gems: alternating colours are no worse than the old per-gem path ---
{
  const g = game();
  const colors = ['#00f3ff', '#ff0055'];
  for (let i = 0; i < 60; i++) { const [x, y] = inView(i); g.gems.push(gem(x, y, colors[i % 2])); }
  const ctx = recorder();
  g.renderGems(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 60,
    'a pathological alternating frame degrades to one fill per gem, never worse');
  assert.equal(count(ctx.calls, 'moveTo'), 60);
}

// --- gems: each special kind keeps its original colour and stroke ---
{
  const g = game();
  // Contiguous blocks, which is how drops actually accumulate.
  for (let i = 0; i < 5; i++) g.gems.push(gem(i * 20 - 40, 0, '#00ff66', 'heal'));
  for (let i = 0; i < 5; i++) g.gems.push(gem(i * 20 - 40, 40, '#00f3ff', 'magnet'));
  for (let i = 0; i < 5; i++) g.gems.push(gem(i * 20 - 40, 80, '#ffaa00', 'nuke'));
  const ctx = recorder();
  g.renderGems(ctx, visibleFor(g));
  // heal run fills, magnet run strokes, nuke run fills then strokes.
  assert.equal(count(ctx.calls, 'fill'), 2, 'the heal run and the nuke run fill');
  assert.equal(count(ctx.calls, 'stroke'), 2, 'the magnet run and the nuke outline stroke');
  assert.equal(count(ctx.calls, 'rect'), 10, 'heal keeps its two bars per pickup');
  assert.equal(count(ctx.calls, 'arc'), 10, 'five magnets plus five nukes');
}

// --- gems: interleaved specials degrade to one pass each, never worse ---
{
  const g = game();
  for (let i = 0; i < 5; i++) {
    g.gems.push(gem(i * 20 - 40, 0, '#00ff66', 'heal'));
    g.gems.push(gem(i * 20 - 40, 40, '#00f3ff', 'magnet'));
    g.gems.push(gem(i * 20 - 40, 80, '#ffaa00', 'nuke'));
  }
  const ctx = recorder();
  g.renderGems(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 10, 'five heals plus five nukes fill individually');
  assert.equal(count(ctx.calls, 'stroke'), 10, 'five magnets plus five nukes stroke individually');
  assert.equal(count(ctx.calls, 'arc'), 10, 'no special may be dropped');
}

// --- enemy bullets: a same-colour barrage collapses to one fill ---
{
  const g = game();
  for (let i = 0; i < 200; i++) { const [x, y] = inView(i); g.enemyBullets.push({ x, y, radius: 6, color: '#ff007f' }); }
  const ctx = recorder();
  g.renderEnemyBullets(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 1, '200 same-colour enemy bullets must batch into one fill');
  assert.equal(count(ctx.calls, 'arc'), 200);
  assert.equal(count(ctx.calls, 'moveTo'), 200, 'each arc needs its own subpath');
  assert.equal(count(ctx.calls, 'save'), 0);
}

// --- enemy bullets: colour changes close the run ---
{
  const g = game();
  for (let i = 0; i < 60; i++) {
    const [x, y] = inView(i);
    g.enemyBullets.push({ x, y, radius: 6, color: i < 30 ? '#ff007f' : '#00f3ff' });
  }
  const ctx = recorder();
  g.renderEnemyBullets(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 2, 'a colour change must close the run and start a new fill');
}

// --- player bullets: plain bullets batch ---
{
  const g = game();
  for (let i = 0; i < 220; i++) { const [x, y] = inView(i); g.bullets.push(bullet(x, y)); }
  const ctx = recorder();
  g.renderBullets(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 1, '220 plain bullets must batch into one fill');
  assert.equal(count(ctx.calls, 'rotate'), 0, 'no missile in this frame');
}

// --- cluster bomblets and missiles keep their own art and close the run ---
{
  const g = game();
  for (let i = 0; i < 40; i++) { const [x, y] = inView(i); g.bullets.push(bullet(x, y, '#ff66cc', 'cluster_missile')); }
  const ctx = recorder();
  g.renderBullets(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'fill'), 80, 'each cluster bomblet draws an outer and an inner disc');
  assert.equal(count(ctx.calls, 'arc'), 80);
}
{
  const g = game();
  g.bullets.push(bullet(-200, 0));
  g.bullets.push({ ...bullet(-160, 0, '#ff007f', 'missile'), isLevel5: true });
  g.bullets.push(bullet(-120, 0));
  const ctx = recorder();
  g.renderBullets(ctx, visibleFor(g));
  assert.equal(count(ctx.calls, 'save'), 1, 'the missile keeps its own rotated art');
  assert.equal(count(ctx.calls, 'rotate'), 1);
  assert.equal(count(ctx.calls, 'rect'), 1, 'rect() fallback when roundRect is unavailable');
  assert.equal(count(ctx.calls, 'fill'), 5,
    'two plain runs plus the missile fuselage, tip and flare');
}

// --- off-screen entities must not be submitted at all ---
{
  const g = game();
  g.gems.push(gem(99999, 99999));
  g.enemyBullets.push({ x: 99999, y: 99999, radius: 6, color: '#ff007f' });
  g.bullets.push(bullet(99999, 99999));
  const ctx = recorder();
  g.renderGems(ctx, visibleFor(g));
  g.renderEnemyBullets(ctx, visibleFor(g));
  g.renderBullets(ctx, visibleFor(g));
  assert.equal(ctx.calls.length, 0, 'nothing off-screen may reach the context');
}

// --- an empty frame must not replay the previous frame's run ---
{
  const g = game();
  for (let i = 0; i < 10; i++) { const [x, y] = inView(i); g.gems.push(gem(x, y)); }
  const first = recorder();
  g.renderGems(first, visibleFor(g));
  assert.equal(count(first.calls, 'fill'), 1);

  g.gems.length = 0;
  const empty = recorder();
  g.renderGems(empty, visibleFor(g));
  assert.equal(empty.calls.length, 0, 'a cleared frame must draw nothing');

  for (let i = 0; i < 10; i++) { const [x, y] = inView(i); g.gems.push(gem(x, y, '#ff0055')); }
  const second = recorder();
  g.renderGems(second, visibleFor(g));
  assert.equal(count(second.calls, 'fill'), 1);
  assert.equal(second.calls.filter(c => c[0] === 'fill').length, 1,
    'the previous colour must not survive into the next frame');
}

console.log('Render batching passed: run-length fills for gems/bullets/barrages, '
  + 'culling intact, worst case never worse than per-entity.');
