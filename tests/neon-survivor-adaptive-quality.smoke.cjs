/* Run: node tests/neon-survivor-adaptive-quality.smoke.cjs
 *
 * Phone heat on this game is fill rate, not simulation: the profiler shows the
 * per-entity query loops at a fraction of a percent of a frame while render()
 * is ~60%. The adaptive ladder therefore only touches the two things that
 * reduce pixels written -- the canvas backing-store scale and shadow blur.
 *
 * The decision function is pure and tested directly, then the frame-cost
 * tracker is driven with synthetic frame times to pin the behaviour that
 * matters: degrade under sustained load, recover only with sustained headroom,
 * never oscillate on a single frame, and never climb above the level the
 * player asked for.
 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const sandbox = {
  window: { addEventListener() {}, devicePixelRatio: 3 },
  document: { getElementById() { return null; }, addEventListener() {} },
  navigator: { getGamepads() { return []; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 0 }, console,
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runCore(sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const ladder = vm.runInContext('QualityLadder', sandbox);

// --- the ladder is ordered best-first and the levers actually shrink ---
// Array.from rebuilds the list in this realm; a vm-realm array would fail
// deepStrictEqual purely because its prototype differs.
assert.deepEqual(Array.from(ladder.LEVELS, l => l.name), ['high', 'medium', 'low', 'minimal']);
assert.equal(ladder.LEVELS[0].dprCap, 2, 'the default level keeps the old 2x cap');
for (let i = 1; i < ladder.LEVELS.length; i++) {
  assert.ok(ladder.LEVELS[i].dprCap < ladder.LEVELS[i - 1].dprCap,
    `${ladder.LEVELS[i].name} must lower the pixel cap`);
}
assert.equal(ladder.LEVELS[0].shadow, true, 'shadow blur is on at full quality');
assert.equal(ladder.LEVELS.at(-1).shadow, false, 'the floor drops shadow blur');
assert.ok(ladder.BUDGET_MS < 16.7, 'the budget must leave headroom in a 60Hz frame');

// --- pure decision function ---
{
  const floor = ladder.floorIndex();
  const over = ladder.BUDGET_MS + 5;
  const under = ladder.BUDGET_MS * 0.3;
  const mid = ladder.BUDGET_MS * 0.8;

  assert.equal(ladder.decide(0, over, 0, false), 1, 'sustained load degrades');
  assert.equal(ladder.decide(floor, over, 0, false), 0, 'the floor is never passed');
  assert.equal(ladder.decide(0, under, ladder.RECOVER_WINDOWS, false), 0,
    'a full-quality start has nowhere better to go');
  assert.equal(ladder.decide(2, under, ladder.RECOVER_WINDOWS, false), -1,
    'sustained headroom recovers');
  assert.equal(ladder.decide(2, under, ladder.RECOVER_WINDOWS - 1, false), 0,
    'recovery needs sustained headroom, not one good window');
  assert.equal(ladder.decide(2, mid, ladder.RECOVER_WINDOWS, false), 0,
    'the mid band holds, which is what stops oscillation');

  // A low-effects preference starts lower and is also the recovery limit.
  assert.equal(ladder.startIndex(false), 0);
  assert.equal(ladder.startIndex(true), 2);
  assert.equal(ladder.decide(2, under, ladder.RECOVER_WINDOWS, true), 0,
    'the ladder must never recover above the player\'s low-effects choice');
  assert.equal(ladder.decide(2, over, 0, true), 1,
    'a low-effects start may still degrade further under load');
}

// --- applying a level moves the pixel cap and the shadow switch together ---
function game(fxLow) {
  const g = Object.create(proto);
  g.dpr = 2; g.fxLow = fxLow;
  g.width = 390; g.height = 844;
  g.ctx = { resetTransform() {}, scale() {} };
  g.canvas = { width: 0, height: 0 };
  g.resizeCalls = 0;
  g.resize = () => { g.resizeCalls++; };
  return g;
}
{
  const g = game(false);
  const high = g.applyQuality(0);
  assert.equal(high.name, 'high');
  assert.equal(g.qualityIndex, 0);
  assert.equal(g.qualityLevel, 'high');
  assert.equal(g.dpr, 2, 'capped by the level, not by the 3x device ratio');
  assert.equal(g.fxShadow, true);
  assert.equal(g.resizeCalls, 0, 'no resize when the cap is unchanged');

  const low = g.applyQuality(2);
  assert.equal(low.name, 'low');
  assert.equal(g.dpr, 1.25, 'the low level drops the cap');
  assert.equal(g.fxShadow, false, 'and drops shadow blur');
  assert.equal(g.resizeCalls, 1, 'a cap change must resize the backing store');

  const minimal = g.applyQuality(3);
  assert.equal(minimal.dprCap, 1);
  assert.equal(g.dpr, 1);
  assert.equal(g.resizeCalls, 2);

  // Out-of-range indices clamp instead of throwing.
  assert.equal(g.applyQuality(99).name, 'minimal');
  assert.equal(g.applyQuality(-5).name, 'high');
}

// --- frame-cost tracking: degrade under load, then hold at the floor ---
function drive(g, costMs, frames) {
  for (let i = 0; i < frames; i++) g.trackFrameCost(costMs);
}
{
  const g = game(false);
  const windows = 3;
  const perWindow = ladder.SAMPLE_FRAMES;

  // A partial window must not move the ladder.
  drive(g, 50, perWindow - 1);
  assert.equal(g.qualityIndex, 0, 'the first frame derives the starting level');
  assert.equal(g.dpr, 2, 'a partial window must not change the pixel cap');

  // Completing the window degrades exactly one step.
  g.trackFrameCost(50);
  assert.equal(g.qualityIndex, 1, 'one expensive window degrades one step');
  assert.equal(g.dpr, 1.5);

  drive(g, 50, perWindow * windows);
  assert.equal(g.qualityIndex, ladder.floorIndex(), 'sustained load reaches the floor');
  assert.equal(g.dpr, 1);
  assert.equal(g.fxShadow, false);

  // It must not fall off the end of the ladder.
  drive(g, 50, perWindow * 3);
  assert.equal(g.qualityIndex, ladder.floorIndex());
  assert.equal(g.dpr, 1);
}

// --- recovery needs sustained headroom and stops at the start level ---
{
  const g = game(false);
  const perWindow = ladder.SAMPLE_FRAMES;
  drive(g, 50, perWindow * 4);
  assert.equal(g.qualityIndex, ladder.floorIndex());

  // A single good window must not recover.
  drive(g, 1, perWindow);
  assert.equal(g.qualityIndex, ladder.floorIndex(), 'one good window is not enough');

  // A mid-band window must reset the good-window counter.
  drive(g, ladder.BUDGET_MS * 0.8, perWindow);
  drive(g, 1, perWindow * (ladder.RECOVER_WINDOWS - 1));
  assert.equal(g.qualityIndex, ladder.floorIndex(),
    'the good-window run must restart after a mid-band window');

  // Sustained headroom recovers, one step per window, back to the start level.
  drive(g, 1, perWindow * ladder.RECOVER_WINDOWS);
  assert.equal(g.qualityIndex, ladder.floorIndex() - 1, 'sustained headroom recovers a step');
  drive(g, 1, perWindow * ladder.RECOVER_WINDOWS * 4);
  assert.equal(g.qualityIndex, ladder.startIndex(false),
    'recovery stops at the level the player is entitled to');
  assert.equal(g.dpr, 2);
  assert.equal(g.fxShadow, true);
}

// --- a low-effects preference starts low and can never recover above it ---
{
  const g = game(true);
  drive(g, 1, ladder.SAMPLE_FRAMES);
  assert.equal(g.qualityIndex, ladder.startIndex(true), 'low effects starts at the low level');
  assert.equal(g.dpr, 1.25);
  assert.equal(g.fxShadow, false);

  drive(g, 1, ladder.SAMPLE_FRAMES * ladder.RECOVER_WINDOWS * 5);
  assert.equal(g.qualityIndex, ladder.startIndex(true),
    'no amount of headroom may exceed the player\'s preference');
  assert.equal(g.dpr, 1.25, 'and the pixel cap stays where the player put it');

  // It can still degrade further if the device cannot cope.
  drive(g, 50, ladder.SAMPLE_FRAMES * 2);
  assert.equal(g.qualityIndex, ladder.floorIndex());
  assert.equal(g.dpr, 1);
}

// --- NaN frame costs must not poison the average ---
{
  const g = game(false);
  drive(g, Number.NaN, ladder.SAMPLE_FRAMES * 2);
  assert.equal(g.qualityIndex, 0, 'a non-finite cost is ignored, not treated as load');
  assert.equal(g.dpr, 2);
}

// --- the guest world view must not drive the host's canvas ---
{
  const source = require('node:fs').readFileSync(
    neonCore.ROOT + '/js/core/render/index.js', 'utf8');
  assert.match(source, /if \(!this\.isGuestWorldView\) this\.trackFrameCost/,
    'only the authoritative world may adapt the shared canvas');
}

console.log('Adaptive quality passed: pure ladder decisions, hysteresis, floor and '
  + 'preference ceiling, DPR/shadow applied together, guest excluded.');
