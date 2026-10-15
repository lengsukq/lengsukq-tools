/* Run: node tests/neon-survivor-shared-render.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.indexOf('network/world-view.js') < html.indexOf('network/coop.js'));
const paint = [];
const ctx = new Proxy({}, {
  get(obj, property) {
    if (property in obj) return obj[property];
    return (...args) => { paint.push([property, ...args]); };
  },
  set(obj, property, value) { obj[property] = value; return true; }
});
const events = { hud: [], upgrades: [] };
const errors = [];
const sandbox = {
  window: { addEventListener() {} },
  console: { error(...args) { errors.push(args); }, warn() {}, log() {} },
  document: { getElementById() { return null; } },
  navigator: { getGamepads: () => [] },
  localStorage: { getItem: () => null, setItem() {} },
  performance: { now: () => 2000 }, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['network/schema','network/world-view', 'network/coop']);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const game = Object.create(proto);
Object.assign(game, {
  width: 390, height: 844, dpr: 1, ctx, cameraZoom: 1.25,
  camera: { x: 0, y: 0 }, player: { x: 0, y: 0, hp: 100, maxHp: 100, radius: 16,
    level: 1, xp: 0, xpNeeded: 100, aimAngle: 0, weapons: { blaster: 1 }, passives: {} },
  survivalTime: 33, kills: 6, state: 'lan-client',
  enemies: [], bullets: [], gems: [], enemyBullets: [], texts: [], particles: [],
  shockwaves: [], laserBeams: [], companionDrones: [], blackHoles: [],
  mines: [], lightningTethers: [], orbiters: [], dashTrails: [],
  modalLevelup: { classList: { add() {}, remove() {} } },
  updateHUD() { events.hud.push({ hp: this.player.hp, x: this.player.x, level: this.player.level }); },
  renderWeaponsHUD() { events.upgrades.push(Object.keys(this.player.weapons)); }
});
const { Coop, boundedSnapshot, newAlly } = sandbox.window.NeonLanCoop;
const guest = new Coop(game, { role: 'guest', connected: true, send: () => true });
guest.guestMode = true;
game.lanCoop = guest;
guest.latest = {
  type: 'snapshot', seq: 3, time: 33, kills: 6, phase: 'playing',
  host: { x: 230, y: 50, hp: 80, maxHp: 100, aimAngle: 1, name: '房主', color: '#00f3ff' },
  guest: { x: 60, y: -20, hp: 55, maxHp: 120, aimAngle: 0,
    charges: 4, maxCharges: 5, weapons: { blaster: 2, missiles: 1 }, passives: { armor: 1 } },
  teamXP: { level: 5, xp: 12, xpNeeded: 95 },
  enemies: [
    { id: 1, type: 'charger', x: 110, y: 10, vx: 1, vy: 0, radius: 16,
      hp: 30, maxHp: 100, color: '#ff0000' },
    { id: 2, type: 'boss_carrier', x: 300, y: 60, radius: 45,
      hp: 1500, maxHp: 2000, color: '#ffff00', isBoss: true },
    { id: 3, type: 'swarmer', x: 9999, y: 9999, radius: 12,
      hp: 25, maxHp: 25, color: '#ff0000' }
  ],
  bullets: [{ id: 20, type: 'missile', x: 120, y: 40, vx: 150, vy: 80, radius: 6,
    color: '#ff00aa', isLevel5: true }],
  gems: [{ id: 30, x: 70, y: 40, radius: 4, color: '#00f3ff', type: 'gem' }],
  shockwaves: [{ id: 31, x: 200, y: 20, radius: 60, color: '#00f3ff', alpha: .9 }],
  particles: [{ id: 32, type: 'spark', x: 10, y: 20, radius: 4, life: .2, maxLife: .4,
    color: '#ffee00' }],
  enemyBullets: [], laserBeams: [{ x: 80, y: 0, angle: .3, length: 100, width: 12 }],
  blackHoles: [{ x: 100, y: 80, radius: 180, rotAngle: 0 }],
  mines: [{ x: 50, y: 60 }],
  orbiters: [{ angle: 1, distance: 80, radius: 9, color: '#00ffaa',
    centerX: 230, centerY: 50 }],
  dashTrails: [], companionDrones: [], lightningTethers: [], texts: []
};
guest.receivedAt = 1900;
guest.renderGuest();
const firstRenderView = guest.guestView;
const firstRenderPlayer = guest.guestView.player;
const firstRenderCamera = guest.guestView.camera;
for (let i = 0; i < 30; i++) guest.renderGuest();
assert.equal(guest.guestView, firstRenderView, 'Guest view object must be reused');
assert.equal(guest.guestView.player, firstRenderPlayer, 'Guest player view must be reused');
assert.equal(guest.guestView.camera, firstRenderCamera, 'Guest camera must be reused');
assert.equal(events.hud.length, 1, 'HUD writes occur per snapshot, not at 60fps');
assert.equal(events.upgrades.length, 1, 'Weapons HUD only rebuilt when loadout changes');
assert.equal(errors.length, 0, 'Guest should not throw inside the shared renderer');
assert.equal(events.hud.at(-1).hp, 55, 'Real HUD uses guest HP');
assert.equal(events.hud.at(-1).level, 5, 'Real HUD uses shared XP level');
assert.deepEqual(events.upgrades.at(-1), ['blaster', 'missiles']);
assert.ok(paint.some(op => op[0] === 'scale' && op[1] === 1.25), 'Same camera scaling');
assert.ok(paint.some(op => op[0] === 'translate' && op[1] === -60 && op[2] === 20),
  'Camera centers on guest instead of host');
assert.ok(paint.some(op => op[0] === 'moveTo' && op[1] === 22 && op[2] === 0),
  'Guest and host fighters share core polygon model');
assert.ok(paint.filter(op => op[0] === 'lineTo').length >= 12,
  'Boss uses its original polygon renderer, not the circular fallback');
assert.ok(paint.some(op => op[0] === 'rotate'), 'Missile/existing weapon FX are rendered');
assert.ok(paint.some(op => op[0] === 'fillRect'), 'Original cyber-grid renders');
assert.equal(paint.some(op => op[0] === 'translate' && op[1] === 9999 && op[2] === 9999), false,
  'Far-offscreen enemies should not consume Canvas drawing operations');

const older = { type: 'snapshot', host: { x: 30, y: 0 }, guest: { x: 0, y: 0 },
  enemies: [{ id: 1, x: 10, y: 0 }, { id: 2, x: 20, y: 0 }], bullets: [] };
const current = { type: 'snapshot', host: { x: 60, y: 0 }, guest: { x: 20, y: 0 },
  enemies: [{ id: 2, x: 120, y: 0 }, { id: 1, x: 50, y: 0 }], bullets: [] };
const halfway = sandbox.window.NeonLanWorldView.interpolate(current, older, .5);
assert.equal(halfway.guest.x, 10);
assert.equal(halfway.enemies.find(e => e.id === 1).x, 30,
  'Interpolation keys by stable entity ID instead of the array index');
assert.equal(halfway.enemies.find(e => e.id === 2).x, 70);
const sampler = sandbox.window.NeonLanWorldView.createSampler(current, older);
const sameA = sampler.sample(.5);
const firstEnemy = sameA.enemies[0];
assert.equal(sameA.enemies.find(e => e.id === 1).x, 30);
const sameB = sampler.sample(.8);
assert.equal(sameA, sameB, 'Per-frame interpolation must reuse scene');
assert.equal(sameB.enemies[0], firstEnemy, 'Per-frame interpolation must reuse entities');
assert.equal(sameB.enemies.find(e => e.id === 1).x, 42);
assert.equal(current.enemies.find(e => e.id === 1).x, 50,
  'Interpolation must never mutate authoritative snapshot');

const hostGame = {
  state: 'playing', survivalTime: 180, kills: 300,
  endlessMode: true, player: { x: 0, y: 0, level: 6, hp: 100, maxHp: 100,
    xp: 30, xpNeeded: 100, weapons: { blaster: 4 }, passives: {} },
  // Must exceed the declared enemy cap: this fixture asserts the crowded world
  // arrives WHOLE, so it has to produce more rows than the cap allows. The cap
  // follows the largest co-op party (190 enemies at four pilots).
  enemies: Array.from({ length: 200 }, (_, n) => ({
    x: n * 5, y: n * 2, hp: 100, maxHp: 100, vx: 0, vy: 0,
    color: '#eeeeee', type: 'swarmer', radius: 10
  })),
  bullets: Array.from({ length: 150 }, (_, n) => ({
    x: n * 5, y: 0, vx: 600, vy: 10, damage: 30,
    type: 'missile', radius: 4, color: '#ff00aa'
  })),
  enemyBullets: [], gems: [], particles: [], shockwaves: [], texts: []
};
const ally = newAlly(hostGame);
const pack = boundedSnapshot(hostGame, ally, 1);
const schema = sandbox.window.NeonLanSchema;
assert.ok(schema.byteLength(JSON.stringify(pack)) < 40000,
  'Crowded world must fit RTC frame budget');
assert.equal(pack.guest.hp, 100);
// The wire carries columns; the guest reads rows. Both ends go through the
// contract, so the assertion has to as well.
const delivered = schema.decodeFrame(pack);
assert.equal(delivered.enemies.length, schema.capOf('enemies'),
  'a crowded world must arrive whole, up to the declared cap');
assert.equal(delivered.bullets.length, schema.capOf('bullets'), 'and so must every bullet');
assert.equal(delivered.enemies[0].hp, 100);
assert.equal(sandbox.window.NeonLanCoop.safeSnapshot(pack), true);

// ---------------------------------------------------------------------------
// Render parity: the wire encoding must be INVISIBLE to the painter.
//
// This is the strongest statement of "the guest sees the same world" that can be
// made without a browser: paint the same world twice, once straight from the
// host's rows and once after a full encode/decode round trip, and require the
// two canvas operation logs to be identical. It is what justifies decoding an
// entity field that was absent as 0/'' instead of undefined.
// ---------------------------------------------------------------------------
{
  // The engine flame is deliberately random per frame (`flameLen = 10 +
  // Math.random() * 8`), so the two paints have to share one random sequence for
  // the comparison to be about the WIRE rather than about the flame.
  vm.runInContext(`globalThis.__seed = 1;
    Math.random = () => { __seed = (__seed * 1103515245 + 12345) % 2147483648;
      return __seed / 2147483648; };
    globalThis.__resetRandom = () => { __seed = 1; };`, sandbox);
  const rowFrame = {
    ...guest.latest,
    // Every layer, so no kind of column is left untested.
    enemyBullets: [{ id: 40, x: 150, y: 30, radius: 5, color: '#ff3366' }],
    dashTrails: [{ id: 41, x1: 1, y1: 2, x2: 3, y2: 4, color: '#00f3ff', life: .3, maxLife: .4 }],
    companionDrones: [{ id: 42, x: 20, y: 20, angle: 1.2 }],
    texts: [{ id: 43, x: 40, y: 30, text: '命中 42', color: '#00f3ff', size: 15,
      life: .8, maxLife: .8 }]
  };
  const paintFrom = state => {
    const coop = new Coop(game, { role: 'guest', connected: true, send: () => true });
    coop.guestMode = true;
    coop.latest = state;
    coop.receivedAt = guest.receivedAt;
    game.lanCoop = coop;
    vm.runInContext('__resetRandom()', sandbox);
    const mark = paint.length;
    coop.renderGuest();
    return paint.slice(mark);
  };
  const direct = paintFrom(rowFrame);
  const throughTheWire = paintFrom(schema.decodeFrame(schema.encodeFrame(rowFrame)));
  game.lanCoop = guest;
  assert.ok(direct.length > 100,
    `the reference render must actually draw something (got ${direct.length} operations)`);
  assert.deepEqual(throughTheWire, direct,
    'a frame that made a round trip through the wire must paint identically');
}
console.log('Shared renderer passed: guest draws original engine, own HUD, camera, weapons, '
  + 'stable-ID interpolation, RTC packet budgeting and byte-identical paint after a wire round trip.');
