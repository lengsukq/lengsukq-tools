/* Run: node tests/neon-survivor-boss-art.smoke.cjs
 *
 * Two failures motivated this test, and both were silent — nothing threw, the
 * boss simply was not there:
 *
 *   1. boss_mirror_bastion and boss_polarity_split had NO body painter anywhere
 *      in the codebase. Both encounters were fought against an invisible boss
 *      plus its mechanic overlay, on the host's screen as well as the guest's,
 *      from the day the registry was written.
 *   2. The elite badge and HP bar inherited whatever rotation the body branch
 *      had left on the transform, so a charging elite's "★精英" rendered
 *      mirrored. ctx.rotate is not undone by the next ctx.beginPath.
 *
 * So this test does not just assert "renderEnemies does not throw": it asserts
 * that every boss type paints a real body, and that every type leaves the
 * transform exactly as it found it. The checker is deliberately generic, so a
 * future boss type with no painter fails here rather than shipping invisible.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
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

/* A ctx that records every call and audits the transform stack.
 *
 * The subtle part is measuring the rotation. renderEnemies wraps each enemy in
 * its own ctx.save/ctx.restore, so a body branch that rotates and forgets to
 * restore is silently absorbed by that outer restore — the next enemy starts
 * clean and a naive "is the transform identity at the end?" check passes.
 * The damage is done to the *sibling* draws in the same iteration: the elite
 * badge and the HP bar, which come after the body. So this recorder captures
 *   - the rotation in effect at each fillText, and
 *   - the rotation left over at the moment the outer save is popped,
 * which are the two places a leaked rotation actually shows up. */
function recorder() {
  const calls = [];
  let depth = 0, maxDepth = 0, stack = [], leaked = 0, rot = 0, leakedRot = 0;
  const ctx = new Proxy({}, {
    get(_t, key) {
      if (key === 'canvas') return { width: 1280, height: 720 };
      if (key === 'measureText') return () => ({ width: 10 });
      return (...args) => {
        if (key === 'save') { stack.push(rot); depth++; if (depth > maxDepth) maxDepth = depth; }
        if (key === 'restore') {
          if (depth === 0) leaked++;
          else {
            depth--;
            // depth back to 0 == the per-enemy restore; whatever rotation is
            // still live here was never restored by the body branch.
            if (depth === 0) leakedRot = rot;
            rot = stack.pop();
          }
        }
        if (key === 'rotate') rot += args[0];
        const call = [key, ...args];
        call.rot = rot;
        calls.push(call);
      };
    },
    set() { return true; }
  });
  return {
    ctx, calls,
    audit: () => ({ depth, maxDepth, leaked, leakedRot })
  };
}

function view(overrides) {
  return Object.assign(Object.create(proto), {
    survivalTime: 12.5, fxShadow: false, currentBoss: null, enemies: [],
    player: { x: 0, y: 0, radius: 16, hp: 100, maxHp: 100 }
  }, overrides);
}

/* label -> the snapshot fields a guest actually receives for that boss. The
 * field list is js/network/schema.js's enemy whitelist; anything outside it
 * would not survive the wire, so art may not depend on it. */
const BOSSES = [
  ['boss_nexus', { radius: 46, color: '#00f3ff', hp: 4500, maxHp: 4500 }],
  ['boss_carrier shielded', { radius: 52, color: '#ff007f', hp: 7500, maxHp: 7500, hasShield: true }],
  ['boss_carrier broken', { radius: 52, color: '#ff007f', hp: 900, maxHp: 7500, hasShield: false }],
  ['boss_devourer', { radius: 54, color: '#9d00ff', hp: 11000, maxHp: 11000 }],
  ['boss_devourer hurt', { radius: 54, color: '#9d00ff', hp: 1200, maxHp: 11000 }],
  ['boss_dual_reactor', { radius: 52, color: '#72ffe0', hp: 7100, maxHp: 7100, coopCapture: 0.9 }],
  ['boss_mirror_bastion', { radius: 50, color: '#ff9f43', hp: 7800, maxHp: 7800, vx: 5, vy: 3, arming: true, coopCapture: 0.6 }],
  ['boss_polarity_split', { radius: 48, color: '#8f7dff', hp: 8200, maxHp: 8200, arming: true, aimTimer: 2.2, coopCapture: 1.0 }]
];
const BOSS_TYPES = BOSSES
  .map(([label]) => label.replace(/ (shielded|broken|hurt)$/, ''))
  .filter((type, i, all) => all.indexOf(type) === i);

// --- every boss type the game can spawn must be covered here ----------------
// A type that exists in the game but is missing from the roster above is
// precisely how the two invisible bosses went unnoticed, so the roster is
// cross-checked against its two sources instead of being trusted.
{
  const dir = neonCore.ROOT + '/js';
  const declared = new Set();
  for (const file of ['/network/coop-bosses.js', '/core/director/boss.js']) {
    const src = fs.readFileSync(dir + file, 'utf8');
    for (const m of src.matchAll(/type:\s*'(boss_[a-z_]+)'/g)) declared.add(m[1]);
  }
  assert.ok(declared.size >= 6, `expected at least 6 boss types, found ${declared.size}`);
  for (const type of declared) {
    assert.ok(BOSS_TYPES.includes(type),
      `${type} exists in the game but is not covered by this test's roster`);
  }
}

// --- each boss draws a body and leaves the transform as it found it ---------
for (const [label, fields] of BOSSES) {
  const type = label.replace(/ (shielded|broken|hurt)$/, '');
  for (const host of [true, false]) {
    const { ctx, calls, audit } = recorder();
    const game = view({ isGuestWorldView: !host });
    game.enemies = [{ x: 0, y: 0, vx: 0, vy: 0, type, isBoss: true, ...fields }];
    assert.doesNotThrow(() => game.renderEnemies(ctx, () => true),
      `${label} must render on the ${host ? 'host' : 'guest'}`);

    const body = calls.filter(c => c[0] === 'arc' || c[0] === 'fill' ||
      c[0] === 'stroke' || c[0] === 'fillRect');
    assert.ok(body.length >= 5,
      `${label} must paint a real body on the ${host ? 'host' : 'guest'}; `
      + `${body.length} body calls is the invisible-boss signature`);

    const a = audit();
    assert.equal(a.depth, 0, `${label} leaked a ctx.save/restore pair`);
    assert.equal(a.leaked, 0, `${label} called ctx.restore without a matching save`);
    assert.ok(Math.abs(a.leakedRot) < 1e-9,
      `${label} left ctx rotated by ${a.leakedRot} rad when the per-enemy restore `
      + 'ran; the HP bar and badge below the body inherit that rotation and render '
      + 'mirrored');
  }
}

// --- an unrecognised boss keeps the plain-circle fallback -------------------
// renderEnemies has always fallen back to a filled circle for a boss type it
// does not know, which is what keeps a modded or future boss visible.
{
  const { ctx, calls } = recorder();
  const game = view();
  game.enemies = [{ x: 0, y: 0, type: 'boss_from_the_future', isBoss: true,
    radius: 40, color: '#fff', hp: 100, maxHp: 100 }];
  assert.doesNotThrow(() => game.renderEnemies(ctx, () => true));
  const arcs = calls.filter(c => c[0] === 'arc');
  assert.ok(arcs.length >= 1, 'an unknown boss must still get the plain-circle fallback');
  assert.ok(arcs.some(c => Math.abs(c[3] - 40) < 1e-6),
    'the fallback circle must use the boss radius');
}

// --- an elite rotated body must not rotate the badge or the HP bar ----------
// This is the concrete symptom of failure (2) above: the badge and bar are
// drawn after the body, so a body that rotates without restoring prints them
// mirrored. Both signals are checked — the leftover rotation at the per-enemy
// restore, and the rotation actually live when each fillText is issued.
for (const type of ['charger', 'sniper']) {
  const { ctx, calls, audit } = recorder();
  const game = view({ player: { x: 40, y: 40 } });
  // A heading well away from 0 so a leaked rotation is unambiguous.
  game.enemies = [{ x: 0, y: 0, vx: -3, vy: 2, radius: 18, color: '#ff0055',
    type, isElite: true, hp: 60, maxHp: 60 }];
  game.renderEnemies(ctx, () => true);

  assert.ok(Math.abs(audit().leakedRot) < 1e-9,
    `an elite ${type} leaked its body rotation into the badge and HP bar`);

  const texts = calls.filter(c => c[0] === 'fillText');
  const badges = texts.map(c => c[1]);
  assert.deepEqual(badges, ['★精英'],
    `an elite ${type} must emit exactly one badge`);
  for (const call of texts) {
    assert.ok(Math.abs(call.rot) < 1e-9,
      `an elite ${type} drew its badge at ${call.rot} rad, so it renders mirrored`);
  }
}

console.log('Boss art passed: every boss type paints a real body on host and guest, '
  + 'the transform survives rotation, and the elite badge never mirrors.');
