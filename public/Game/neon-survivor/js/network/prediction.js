/* Visual-only client prediction. The host always decides positions, hits,
 * cooldowns and damage; this module never changes authoritative game state.
 * Input acknowledgements bound how much movement is replayed after a snapshot.
 */
(() => {
  'use strict';
  const HISTORY_MS = 800;
  const SNAP_DISTANCE = 300;
  const CORRECTION_RATE = 11;
  const MAX_REPLAY_MS = 180;
  const finite = value => Number.isFinite(value) ? value : 0;

  function create(x, y) {
    return {
      x: finite(x), y: finite(y), steps: [], inputSentAt: new Map(),
      correctionX: 0, correctionY: 0, dashUntil: 0, dashEffectUntil: 0
    };
  }

  function moveSpeed(guest, now, state) {
    if (!guest || guest.downed) return 0;
    if (guest.shipId === 'riftblade' && now < state.dashUntil) return 780;
    const base = window.NeonShips?.get?.(guest.shipId)?.baseStats?.speed || 240;
    const level = Math.max(1, guest.level || 1);
    const thruster = guest.passives?.thruster || 0;
    let speed = Math.min(385, (base + Math.min(120, (level - 1) * 6)) * (1 + .15 * thruster));
    if (guest.shipId === 'astra' && guest.arcane?.wardActive) speed *= .2;
    if (guest.shipId === 'phantom') {
      if (guest.spectral?.docked) return 0;
      if (guest.spectral?.shiftActive) speed *= window.NeonPhantom?.BASE?.shiftSpeedMultiplier || 1.45;
    }
    return speed;
  }

  function advance(state, guest, input, dt, now) {
    if (!state || !Number.isFinite(dt) || dt <= 0) return;
    const speed = moveSpeed(guest, now, state);
    const x = finite(input?.dx) * speed * dt;
    const y = finite(input?.dy) * speed * dt;
    state.x += x;
    state.y += y;
    state.steps.push({ at: now, x, y });
    while (state.steps.length > 120 || state.steps[0]?.at < now - HISTORY_MS) state.steps.shift();
    // Smooth discrepancies every visual frame, not in 15Hz snapshot-sized jumps.
    const fraction = 1 - Math.exp(-CORRECTION_RATE * dt);
    const cx = state.correctionX * fraction, cy = state.correctionY * fraction;
    state.x += cx;
    state.y += cy;
    state.correctionX -= cx;
    state.correctionY -= cy;
    if (Math.hypot(state.correctionX, state.correctionY) < .3) {
      state.correctionX = 0;
      state.correctionY = 0;
    }
  }

  function sent(state, seq, now) {
    if (!state) return;
    state.inputSentAt.set(seq, now);
    while (state.inputSentAt.size > 70) state.inputSentAt.delete(state.inputSentAt.keys().next().value);
  }

  function reconcile(state, guest, now) {
    if (!guest || !Number.isFinite(guest.x) || !Number.isFinite(guest.y)) return state;
    if (!state) return create(guest.x, guest.y);
    const ack = Number.isSafeInteger(guest.lastSeq) ? guest.lastSeq : -1;
    const ackAt = state.inputSentAt.get(ack);
    // Reapply only local movement not yet confirmed by the host. Keep the
    // replay bounded when network stalls or packet acknowledgements are stale.
    const replayAfter = Math.max(now - MAX_REPLAY_MS,
      ackAt === undefined ? now - 65 : ackAt + 20);
    let targetX = guest.x, targetY = guest.y;
    if (!guest.downed) {
      for (const step of state.steps) {
        if (step.at > replayAfter) {
          targetX += step.x;
          targetY += step.y;
        }
      }
    }
    const dx = targetX - state.x, dy = targetY - state.y;
    const distance = Math.hypot(dx, dy);
    if (guest.downed || distance > SNAP_DISTANCE) {
      state.x = targetX;
      state.y = targetY;
      state.correctionX = 0;
      state.correctionY = 0;
    } else if (distance >= 4) {
      state.correctionX = dx;
      state.correctionY = dy;
    } else {
      state.correctionX = 0;
      state.correctionY = 0;
    }
    for (const seq of state.inputSentAt.keys()) {
      if (seq <= ack) state.inputSentAt.delete(seq);
    }
    return state;
  }

  function dash(state, guest, now) {
    if (!state || !guest || guest.downed || guest.charges <= 0) return false;
    if (guest.shipId === 'astra' && guest.arcane?.wardActive) return false;
    if (guest.shipId === 'riftblade') state.dashUntil = now + 180;
    state.dashEffectUntil = now + 290;
    return true;
  }
  window.NeonLanPrediction = Object.freeze({ create, advance, sent, reconcile, dash, moveSpeed });
})();
