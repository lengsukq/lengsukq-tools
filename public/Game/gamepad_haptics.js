/* Shared Web Gamepad haptics adapter.
 * Gamepad rumble depends on hardware, browser and operating-system support.
 * The adapter reports browser acceptance; it cannot verify physical vibration.
 */
(function () {
  'use strict';

  function connectedGamepads() {
    try {
      if (!navigator.getGamepads) return [];
      return Array.from(navigator.getGamepads() || []).filter(gp => gp && gp.connected);
    } catch (_) {
      return [];
    }
  }

  function actuators(gamepad) {
    if (!gamepad) return [];
    const found = [];
    if (gamepad.vibrationActuator) found.push(gamepad.vibrationActuator);
    const secondary = gamepad.hapticActuators;
    if (secondary && typeof secondary.length === 'number') {
      for (const actuator of secondary) {
        if (actuator && !found.includes(actuator)) found.push(actuator);
      }
    }
    return found.filter(actuator =>
      typeof actuator.playEffect === 'function' || typeof actuator.pulse === 'function');
  }

  function supportsRumble(gamepad) {
    return actuators(gamepad).length > 0;
  }

  async function send(actuator, duration, strong, weak) {
    if (typeof actuator.playEffect === 'function') {
      try {
        const outcome = await Promise.resolve(actuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          strongMagnitude: strong,
          weakMagnitude: weak
        }));
        // Web Gamepad returns 'complete' or 'preempted' on accepted requests.
        if (outcome !== false && outcome !== 'not-supported' && outcome !== 'error') return true;
      } catch (_) { /* Older APIs may support pulse only. */ }
    }
    if (typeof actuator.pulse === 'function') {
      try {
        const outcome = await Promise.resolve(actuator.pulse(Math.max(strong, weak), duration));
        if (outcome !== false) return true;
      } catch (_) { /* Browser or hardware declined the request. */ }
    }
    return false;
  }

  async function playConnected(preferredIndex = -1, duration = 120, strong = 0.5, weak = 0.3) {
    const connected = connectedGamepads();
    if (!connected.length) return { status: 'disconnected' };
    const available = connected.filter(supportsRumble);
    if (!available.length) return { status: 'unsupported' };
    const preferred = available.find(gp => gp.index === preferredIndex);
    const target = preferred || available[0];
    const ms = Math.max(40, Math.min(1500, Number(duration) || 120));
    const hi = Math.max(0, Math.min(1, Number(strong) || 0));
    const lo = Math.max(0, Math.min(1, Number(weak) || 0));
    for (const actuator of actuators(target)) {
      if (await send(actuator, ms, hi, lo)) return { status: 'accepted', index: target.index };
    }
    return { status: 'rejected', index: target.index };
  }

  window.GamepadHaptics = { connectedGamepads, supportsRumble, playConnected };
})();
