/* Only bounded primitive, class-specific values enter the public snapshot. */
window.NeonShips.registerNetworkProjection('phantom', pilot => {
  const s = pilot.phantom || {};
  const clamp = (value, min, max) => Number.isFinite(value)
    ? Math.min(max, Math.max(min, value)) : min;
  return { spectral: {
    ectoplasm: clamp(s.ectoplasm, 0, s.maxEctoplasm || 100),
    maxEctoplasm: clamp(s.maxEctoplasm || 100, 1, 200),
    shiftActive: Boolean(s.shiftActive),
    shiftRemaining: clamp(s.shiftRemaining, 0, 10),
    charges: clamp(s.dashCharges, 0, 3),
    recharge: clamp(s.dashRecharge, 0, 8),
    docked: Boolean(s.docked),
    dockCooldown: clamp(s.dockCooldownRemaining, 0, 20),
    markedTargets: Math.min(64, s.marks?.size || 0),
    scythes: (pilot.phantomScythe?.scythes || []).slice(0,6).map(sc=>({
      x:clamp(sc.x,-1e7,1e7), y:clamp(sc.y,-1e7,1e7),
      angle:clamp(sc.angle,-6.29,6.29),
      phase:['out','hover','return'].includes(sc.phase)?sc.phase:'out'
    }))
  } };
});
