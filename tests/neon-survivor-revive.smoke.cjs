/* Run: node tests/neon-survivor-revive.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/js/';
const html = fs.readFileSync('public/Game/neon-survivor/index.html', 'utf8');
assert.ok(html.indexOf('js/network/revive.js') < html.indexOf('js/network/coop.js'));
const context = {
  window: { addEventListener() {} },
  console, performance: { now: () => 1200 },
  document: { getElementById: () => null, body: { classList: { remove() {} } } },
  navigator: { getGamepads: () => [] },
  localStorage: { getItem: () => null, setItem() {} },
  setInterval, clearInterval, setTimeout, clearTimeout
};
vm.createContext(context);
neonCore.runScripts(context, ['players','network/schema','network/revive', 'network/coop']);
const revive = context.window.NeonLanRevive;
const Coop = context.window.NeonLanCoop.Coop;
const Game = vm.runInContext('NeonSurvivorGame.prototype', context);
function makeGame() {
  const game = Object.create(Game);
  const frames = [];
  Object.assign(game, {
    state: 'playing', survivalTime: 0, width: 430, height: 700,
    player: { x: 0, y: 0, hp: 100, maxHp: 100, aimAngle: 0, level: 1,
      invulnTimer: 0, weapons: { blaster: 1 }, passives: {}, radius: 16 },
    enemies: [], bullets: [], enemyBullets: [], gems: [], texts: [], shockwaves: [],
    particles: [], dashTrails: [], orbiters: [], laserBeams: [], blackHoles: [],
    lightningTethers: [], mines: [], companionDrones: [],
    combatTelemetry: { damageTaken: 0 },
    difficulty: 0, endlessMode: false,
    sound: { playLaser() {}, playExplosion() {} },
    vibrateGamepad() {}, releaseJoystickTouch() {},
    getDifficultyRules() { return { enemyDamage: 1 }; },
    gameOver() { this.state = 'gameover'; this.overCount = (this.overCount || 0) + 1; }
  });
  const rtc = { role: 'host', connected: true,
    send(frame) { frames.push(frame); return true; } };
  const coop = new Coop(game, rtc);
  game.lanCoop = coop;
  coop.startHost();
  return { game, coop, frames };
}
function advance(game, dt, total) {
  for (let passed = 0; passed < total - .00001; passed += dt) revive.tick(game, dt);
}
let { game, coop } = makeGame();
let guest = coop.ally;
guest.x = 400; guest.y = 0;
guest.hp = 0;
assert.equal(revive.knockDown(game, 'guest'), true);
assert.equal(revive.knockDown(game, 'guest'), false, 'One death event must count only once');
assert.equal(game.state, 'playing', 'Guest death must not end the session');
assert.equal(coop.rescue.deaths, 1);
assert.equal(coop.rescue.lastStand.duration, 8);
assert.equal(context.window.NeonLanCoop.snapshot(game, guest, 1).rescue.deaths, 1);
const start = guest.x;
coop.onMessage({ type: 'input', seq: 1, dx: 1, dy: 0, aim: 0, dash: true });
assert.equal(guest.x, start);
assert.equal(guest.dashCharges, 3, 'Downed guest cannot dash');
assert.equal(guest.input.dx, 0, 'Downed input must be ignored');
game.state = 'paused';
advance(game, .1, 5);
assert.equal(guest.reviveIn, 8, 'Host pause freezes rescue countdown');
game.state = 'coop-guest-upgrade';
advance(game, .1, 2);
assert.equal(guest.reviveIn, 8, 'Upgrade choices freeze rescue countdown');
game.state = 'playing';
advance(game, .1, 4);
assert.ok(guest.reviveIn > 3.95 && guest.reviveIn < 4.05);
assert.equal(guest.hp, 0);
advance(game, .1, 4.1);
assert.equal(guest.downed, false);
assert.equal(guest.hp, 40);
assert.equal(guest.invulnTimer, 2);
assert.equal(guest.x, game.player.x + 60);
assert.equal(coop.rescue.lastStand, null);
assert.ok(coop.rescue.totalHoldSeconds >= 7.9);

// A new death by the HOST must use the same global count and longer delay.
guest.x = 350;
game.player.x = 0;
game.player.hp = 100;
game.hitPlayer(120);
assert.equal(game.state, 'playing', 'Host death must no longer immediately gameover');
assert.equal(game.player.downed, true);
assert.equal(coop.rescue.deaths, 2);
assert.equal(coop.rescue.lastStand.duration, 12);
assert.equal(game.getActiveSpawnPilot(), guest,
  'During host knockdown new enemies must target the guest survivor');
game.getAdaptiveScaling = () => 1;
game.spawnEnemyWave();
assert.equal(game.enemies.length, 1);
assert.ok(Math.abs(Math.hypot(game.enemies[0].x - guest.x,
  game.enemies[0].y - guest.y) - (Math.hypot(game.width, game.height) / 2 + 80)) < 1,
  'Enemy spawn radius must be centered on the living pilot, not the wreck');
game.enemies.length = 0;
advance(game, .1, 11.9);
assert.equal(game.player.hp, 0);
advance(game, .1, .2);
assert.equal(game.player.downed, false);
assert.equal(game.player.hp, 40);
assert.equal(game.player.x, guest.x + 60);
assert.equal(game.player.invulnTimer, 2);
assert.ok(coop.rescue.totalHoldSeconds >= 19.9);

// A THIRD global death escalates to 16 seconds, with proximity assist
// only after a 3-second uninterrupted standing channel.
guest.x = 480;
guest.y = 0;
guest.hp = 0;
assert.equal(revive.knockDown(game, 'guest'), true);
assert.equal(coop.rescue.deaths, 3);
assert.equal(coop.rescue.lastStand.duration, 16);
game.player.x = guest.x + 40;
advance(game, .1, 2);
assert.equal(coop.rescue.lastStand.assistance, false);
advance(game, .1, 1.1);
assert.equal(coop.rescue.lastStand.assistance, true);
assert.ok(coop.rescue.lastStand.remaining < 13,
  'Near ally doubles the remaining countdown speed after 3 seconds');
advance(game, .1, 7);
assert.equal(guest.downed, false);

// Both wrecks end a run, regardless of which pilot falls second.
guest.hp = 0;
revive.knockDown(game, 'guest');
game.player.hp = 0;
revive.knockDown(game, 'host');
assert.equal(game.state, 'gameover');
assert.equal(game.overCount, 1);
revive.tick(game, .1);
assert.equal(game.overCount, 1);
assert.equal(coop.rescue.deaths, 5);

// Last-stand countdown maximum: cap at 40 seconds; reset next run.
assert.equal(Math.min(revive.MAX_SECONDS, revive.BASE_SECONDS +
  (15 - 1) * revive.EXTRA_SECONDS), 40);
coop.startHost();
assert.equal(coop.rescue.deaths, 0, 'New runs must clear global death count');
assert.equal(coop.rescue.totalHoldSeconds, 0);

// SOLO death semantics stay exactly as before.
const solo = makeGame();
solo.coop.rtc.connected = false;
solo.game.player.hp = 1;
solo.game.hitPlayer(10);
assert.equal(solo.game.state, 'gameover');
assert.equal(solo.game.overCount, 1);
assert.equal(revive.summary(solo.game).fallen, null);

// Exercise the full authoritative Coop.updateHost() call path, not just the
// pure rescue state machine. The host must continue sending countdown packets.
const integrated = makeGame();
integrated.coop.ally.x = 400;
integrated.coop.ally.hp = 0;
integrated.coop.updateHost(.1);
assert.equal(integrated.coop.ally.downed, true);
assert.equal(integrated.coop.rescue.deaths, 1);
assert.ok(integrated.frames.some(frame => frame.rescue?.fallen === 'guest' &&
  frame.rescue.remaining === 8), 'Room snapshot carries the countdown');
for (let n = 0; n < 82; n++) integrated.coop.updateHost(.1);
assert.equal(integrated.coop.ally.downed, false);
assert.ok(integrated.coop.ally.hp >= 40 && integrated.coop.ally.hp < 41,
  'Revived guest can resume natural regeneration on subsequent ticks');
assert.equal(integrated.game.state, 'playing');

// Oversized snapshots with a drone-equipped guest may never execute game
// actions from inside the network serialization path.
integrated.coop.ally.weapons.drones = 2;
integrated.game.enemies = Array.from({ length: 120 }, (_, id) => ({
  x: 100 + id, y: 100 + id, hp: 10, maxHp: 10, radius: 8,
  speed: 60, vx: 0, vy: 0, type: 'swarmer', color: '#ff0000'
}));
const previousBullets = integrated.game.bullets.length;
assert.ok(context.window.NeonLanCoop.boundedSnapshot(integrated.game,
  integrated.coop.ally, 55));
assert.equal(integrated.game.bullets.length, previousBullets,
  'Snapshot serialization must never fire or mutate guest weapons');

// Disconnecting the only survivor must end a host-down run, not leave it
// permanently stuck at 0 HP without a functioning rescue countdown.
const disconnected = makeGame();
disconnected.game.player.hp = 0;
revive.knockDown(disconnected.game, 'host');
assert.equal(disconnected.game.state, 'playing');
disconnected.coop.stop();
assert.equal(disconnected.game.state, 'gameover');

console.log('Symmetric co-op rescue passed: escalating global holdout, pause, both pilots, proximity speed-up, double KO and solo unchanged.');
