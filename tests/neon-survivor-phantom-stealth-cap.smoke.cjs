/* Run: node tests/neon-survivor-phantom-stealth-cap.smoke.cjs
 *
 * Regression: a stealthed Phantom parked on top of a boss used to be able to
 * stay in ghost form — and therefore permanently immune — forever. The scythe
 * kept hitting the (always marked) boss and soul_gatherer refunded more gauge
 * than the 1/s drain, so the shift never expired. Refunds must never extend a
 * running shift, and a finished shift must always leave a materialised gap.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');

assert.ok(html.includes('js/ships.generated.js'));

const ctx = { window: {}, console };
vm.createContext(ctx);
for (const file of ['js/ships/phantom/abilities.js', 'js/ships/phantom/weapons.js',
  'js/ships/phantom/arsenal.js']) {
  vm.runInContext(fs.readFileSync(root + file, 'utf8'), ctx);
}
const P = ctx.window.NeonPhantom;
const Scythe = ctx.window.NeonPhantomScythe;
const Arsenal = ctx.window.NeonPhantomArsenal;

// A boss is the worst case: huge HP (never dies), large contact radius so the
// pilot stays glued to it, and therefore permanently marked + permanently hit.
function boss() {
  return { x: 0, y: 0, hp: 1e9, maxHp: 1e9, radius: 90, damage: 40,
    isBoss: true, type: 'boss_nexus', dead: false };
}

function makeGame(target) {
  return {
    state: 'playing', survivalTime: 0, shockwaves: [], enemies: [target],
    dealDamage(enemy, damage) {
      if (!Number.isFinite(damage) || damage <= 0) return;
      enemy.hp -= damage;
      if (enemy.hp <= 0) enemy.dead = true;
    }
  };
}

function makePilot(soulGatherer = 5, dashUpgrades = {}) {
  return {
    shipId: 'phantom', id: 'p-stealth', x: 0, y: 0, hp: 100, maxHp: 100, radius: 16,
    level: 20, dmgMultiplier: 1, cdrMultiplier: 1, aimAngle: 0, invulnTimer: 0,
    weapons: { phantom_scythe: 5 }, passives: { soul_gatherer: soulGatherer },
    dashUpgrades
  };
}

const DT = 1 / 60;
function step(pilot, game, s) {
  game.survivalTime += DT;
  if (pilot.invulnTimer > 0) pilot.invulnTimer = Math.max(0, pilot.invulnTimer - DT);
  P.tick(pilot, game, DT);
  Scythe.tick(pilot, game, DT);
  Arsenal.tick(pilot, game, DT);
  const target = game.enemies[0];
  pilot.x = target.x; pilot.y = target.y; // never leaves the boss hull
  return s;
}

// 1. Parked on the boss, one single shift press, 30 seconds of simulation.
for (const gatherLvl of [0, 1, 3, 5]) {
  const target = boss();
  const game = makeGame(target);
  const pilot = makePilot(gatherLvl);
  const s = P.state(pilot);
  s.passiveUpgrades.soul_gatherer = gatherLvl;

  assert.equal(P.enterShift(pilot, game), true, 'shift starts');
  let stealthTime = 0;
  let previous = s.stealthEnergy;
  let expiredAt = -1;
  for (let frame = 0; frame < 30 * 60; frame++) {
    step(pilot, game, s);
    if (s.shiftActive) {
      assert.ok(s.stealthEnergy <= previous + 1e-9,
        `gauge must only drain during ghost form (gather=${gatherLvl}, frame=${frame})`);
      stealthTime += DT;
      previous = s.stealthEnergy;
    } else if (expiredAt < 0) {
      expiredAt = game.survivalTime;
    }
  }
  assert.equal(s.shiftActive, false, `shift must expire (gather=${gatherLvl})`);
  assert.ok(expiredAt > 0 && expiredAt < 30, 'shift expired inside the window');
  assert.ok(stealthTime <= s.stealthMax + 0.05,
    `stealth is capped by the gauge (gather=${gatherLvl}, ${stealthTime}s vs ${s.stealthMax}s)`);
  assert.ok(stealthTime >= s.stealthMax - 0.05,
    `a full gauge is still usable (gather=${gatherLvl}, ${stealthTime}s)`);
}

// 2. Upgraded gauges stay capped too (spectral_extend 2 + charge_overflow 2 = 8.0s).
{
  const target = boss();
  const game = makeGame(target);
  const pilot = makePilot(5, { spectral_extend: 2, charge_overflow: 2 });
  const s = P.state(pilot);
  assert.equal(s.stealthMax, 8.0);
  s.stealthEnergy = s.stealthMax; // fully charged upgraded gauge
  assert.equal(P.enterShift(pilot, game), true);
  let stealthTime = 0;
  for (let frame = 0; frame < 30 * 60; frame++) {
    step(pilot, game, s);
    if (s.shiftActive) stealthTime += DT;
  }
  assert.equal(s.shiftActive, false);
  assert.ok(stealthTime <= 8.05 && stealthTime >= 7.95,
    `upgraded gauge is still a hard cap (${stealthTime}s)`);
}

// 3. Refunds are recharge-only: rejected mid-shift, applied once materialised.
{
  const pilot = makePilot(5);
  const s = P.state(pilot);
  const game = makeGame(boss());
  assert.equal(P.enterShift(pilot, game), true);
  const during = s.stealthEnergy;
  assert.equal(P.addStealthEnergy(pilot, 2), 0, 'no gain while shifted');
  assert.equal(s.stealthEnergy, during, 'gauge untouched while shifted');
  s.stealthEnergy = 1.0; // spend most of the gauge before materialising
  assert.equal(P.finishShift(pilot, game, true), true);
  assert.equal(P.addStealthEnergy(pilot, 2), 2, 'gain accepted once materialised');
  assert.ok(s.stealthEnergy >= 2.9, 'recharge refund still works out of stealth');
}

// 4. Kill refunds keep their value: reaping marked targets refills the gauge.
{
  const pilot = makePilot(0);
  const game = makeGame(boss());
  const s = P.state(pilot);
  assert.equal(P.enterShift(pilot, game), true);
  s.stealthEnergy = 0.4;
  const marked = { x: 20, y: 0, hp: 5, maxHp: 100, radius: 14, dead: false };
  game.enemies.push(marked);
  assert.equal(P.markEnemy(pilot, marked, game.survivalTime), true);
  assert.equal(P.finishShift(pilot, game, true), true);
  assert.equal(marked.dead, true, 'marked target is reaped');
  assert.ok(s.stealthEnergy > 0.4, 'kill refund still tops the gauge back up');
}

// 5. Toggle spam cannot chain free grace windows into permanent immunity.
{
  const target = boss();
  const game = makeGame(target);
  const pilot = makePilot(5);
  const s = P.state(pilot);
  s.passiveUpgrades.soul_gatherer = 5;
  let protectedTime = 0;
  let longestShift = 0;
  let currentShift = 0;
  let shifts = 0;
  const seconds = 60;
  for (let frame = 0; frame < seconds * 60; frame++) {
    if (!s.shiftActive && P.enterShift(pilot, game)) shifts++;
    step(pilot, game, s);
    if (s.shiftActive) {
      protectedTime += DT;
      currentShift += DT;
      longestShift = Math.max(longestShift, currentShift);
    } else {
      currentShift = 0;
      if (pilot.invulnTimer > 0) protectedTime += DT;
    }
  }
  assert.ok(shifts > 5, 'the spam policy really does re-enter repeatedly');
  assert.ok(longestShift <= s.stealthMax + 0.05, 'no single shift exceeds the gauge');
  assert.ok(protectedTime / seconds < 0.9,
    `immunity uptime must stay bounded (${(protectedTime / seconds * 100).toFixed(1)}%)`);
  assert.ok(P.BASE.shiftReentryLockout > 0.35,
    'the materialise lockout must outlast the 0.35s exit grace');
}

console.log('Phantom stealth cap passed: no refund extends a running shift, gauge caps duration, '
  + 'kill refunds still recharge, and toggle spam stays exposed.');
