/* Only bounded primitive, class-specific values enter the public snapshot. */
window.NeonShips.registerNetworkProjection('phantom', pilot => {
  const s = pilot.phantom || {};
  const clamp = (value, min, max) => Number.isFinite(value)
    ? Math.min(max, Math.max(min, value)) : min;
  // Emitted under the RUNTIME name (`phantom`), so no consumer-side renaming
  // exists: one name per value on the live pilot, on the wire and in the view.
  return { phantom: {
    ectoplasm: clamp(s.ectoplasm, 0, s.maxEctoplasm || 100),
    maxEctoplasm: clamp(s.maxEctoplasm || 100, 1, 200),
    shiftActive: Boolean(s.shiftActive),
    shiftRemaining: clamp(s.shiftRemaining, 0, 10),
    dashCharges: clamp(s.dashCharges, 0, 4),
    dashRecharge: clamp(s.dashRecharge, 0, 8),
    stealthEnergy: clamp(s.stealthEnergy, 0, 10),
    stealthMax: clamp(s.stealthMax, 1, 10),
    shiftLockUntil: clamp(s.shiftLockUntil, 0, 1e6),
    docked: Boolean(s.docked),
    dockCooldownRemaining: clamp(s.dockCooldownRemaining, 0, 20),
    markedTargets: Math.min(64, s.marks?.size || 0),
    shiftFlash: clamp(s.shiftFlash,0,.28),
    reapFlash: clamp(s.reapFlash,0,.28),
    sprintTimer: clamp(s.sprintTimer,0,8),
    vortexTimer: clamp(s.vortexTimer,0,8),
    shiftTrail:(s.shiftTrail || []).slice(-10).map(point=>({
      x:clamp(point.x,-1e7,1e7),y:clamp(point.y,-1e7,1e7),
      angle:clamp(point.angle,-6.29,6.29),
      seq:Math.floor(clamp(point.seq,0,1e9)),
      life:clamp(point.life,0,.5)
    })),
    visual:(pilot.phantomVisual||[]).slice(-24).map(fx=>({
      kind:fx.kind,
      x:clamp(fx.x,-1e7,1e7),y:clamp(fx.y,-1e7,1e7),
      x2:clamp(fx.x2,-1e7,1e7),y2:clamp(fx.y2,-1e7,1e7),
      radius:clamp(fx.radius,8,280),life:clamp(fx.life,0,3),
      maxLife:clamp(fx.maxLife,.01,3)
    })),
    scythes: (pilot.phantomScythe?.orbs || pilot.phantomScythe?.scythes || []).slice(0,8).map(sc=>({
      x:clamp(sc.x,-1e7,1e7), y:clamp(sc.y,-1e7,1e7),
      angle:clamp(sc.angle,-6.29,6.29),
      phase:['flight','locked','out','hover','return'].includes(sc.phase)?sc.phase:'flight',
      auraRadius:clamp(sc.auraRadius || 120, 20, 300)
    }))
  } };
});
