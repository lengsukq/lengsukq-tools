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

  // The guest predicts with the SAME model the host simulates with, so a dash
  // covers exactly the same ground on both screens. This used to hardcode 780
  // px/s for riftblade while the host used baseSpeed * 3.6, which made a
  // guest's dash 10% short at level 1 and 44% short when fully upgraded; the
  // other ships were not predicted at all.
  function moveSpeed(guest, now, state) {
    if (!guest || guest.downed) return 0;
    // A docked phantom rides its carrier; the host pins it there every tick.
    if (guest.shipId === 'phantom' && guest.spectral?.docked) return 0;
    // The snapshot carries the host's authoritative baseSpeed. Prefer it, so
    // no formula can drift; fall back to the shared model before the first
    // snapshot arrives.
    const pilot = Number.isFinite(guest.baseSpeed)
      ? guest : { ...guest, baseSpeed: PilotSpeed.base(guest) };
    return PilotSpeed.move(pilot, now < state.dashUntil);
  }

  function advance(state, guest, input, dt, now) {
    if (!state || !Number.isFinite(dt) || dt <= 0) return;
    const speed = moveSpeed(guest, now, state);
    const x = finite(input?.dx) * speed * dt;
    const y = finite(input?.dy) * speed * dt;
    state.x += x;
    state.y += y;
    state.steps.push({ at: now, x, y });
    // The locally predicted slash ribbon grows with the dash and fades after
    // it, exactly like the host's own ribbon (simulation/player.js).
    if (state.slashFx && state.slashFx.life > 0) {
      state.slashFx.life = Math.max(0, state.slashFx.life - dt);
      if (now < state.dashUntil) {
        state.slashFx.x2 = state.x;
        state.slashFx.y2 = state.y;
      }
    }
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
    if (guest.shipId === 'riftblade') {
      state.dashUntil = now + PilotSpeed.DASH_DURATION * 1000;
      // The ribbon is the signature of a riftblade dash. Build it locally so
      // it appears on the guest's own screen immediately instead of one
      // round-trip later (or never, if the snapshot drops it).
      state.slashFx = {
        x1: state.x, y1: state.y, x2: state.x, y2: state.y,
        life: .28, maxLife: .28,
        fire: Boolean(guest.dashUpgrades?.dash_fire),
        cryo: Boolean(guest.dashUpgrades?.dash_cryo),
        precise: false
      };
    }
    state.dashEffectUntil = now + 290;
    return true;
  }
  window.NeonLanPrediction = Object.freeze({ create, advance, sent, reconcile, dash, moveSpeed });
})();
