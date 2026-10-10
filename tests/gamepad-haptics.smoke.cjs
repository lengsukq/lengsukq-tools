/* Run: node tests/gamepad-haptics.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const pads = [];
const window = {};
const sandbox = { window, navigator: { getGamepads: () => pads } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/Game/gamepad_haptics.js', 'utf8'), sandbox);
const { playConnected, supportsRumble } = window.GamepadHaptics;

(async () => {
  assert.equal((await playConnected()).status, 'disconnected');

  pads.push({ index: 0, connected: true, axes: [], buttons: [] });
  assert.equal(supportsRumble(pads[0]), false);
  assert.equal((await playConnected()).status, 'unsupported');

  let effectCount = 0;
  pads[0].vibrationActuator = { playEffect(kind, config) {
    effectCount++;
    assert.equal(kind, 'dual-rumble');
    assert.equal(config.duration, 220);
    return Promise.resolve('complete');
  } };
  assert.equal((await playConnected(0, 220, 0.65, 0.4)).status, 'accepted');
  assert.equal(effectCount, 1);

  // A synchronous old-style response must not throw on `.catch`.
  pads[0].vibrationActuator.playEffect = () => 'complete';
  assert.equal((await playConnected(0)).status, 'accepted');

  // Unsupported modern API should fall back to the legacy pulse actuator.
  let legacyPulseCount = 0;
  pads[0].vibrationActuator.playEffect = () => Promise.reject(new Error('no permission'));
  pads[0].hapticActuators = [{ pulse(magnitude, duration) {
    legacyPulseCount++;
    assert.ok(magnitude > 0);
    assert.ok(duration >= 40);
    return Promise.resolve(true);
  } }];
  assert.equal((await playConnected()).status, 'accepted');
  assert.equal(legacyPulseCount, 1);

  pads[0].hapticActuators = [];
  assert.equal((await playConnected()).status, 'rejected');

  // Prefer a compatible pad when the first connected controller has no rumble.
  delete pads[0].vibrationActuator;
  pads.push({index: 1, connected: true, vibrationActuator: {playEffect: () => Promise.resolve('complete')}});
  assert.equal((await playConnected(0)).index, 1);

  console.log('Gamepad haptics tests passed: no pad, unsupported, promise, sync, legacy fallback, rejection and multi-pad.');
})().catch(err => { console.error(err); process.exitCode = 1; });
