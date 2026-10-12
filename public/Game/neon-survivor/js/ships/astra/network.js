/* Astra's capped, class-specific network projection is owned by Astra. */
window.NeonShips.registerNetworkProjection('astra', pilot => {
  const clamp = (v, a, b, fallback = 0) => Number.isFinite(v)
    ? Math.max(a, Math.min(b, v)) : fallback;
  const state = pilot.astra || {};
  const anchors = (pilot.starWeave?.anchors || []).slice(0, 3).map(a => ({
    x: clamp(a.x, -1e7, 1e7), y: clamp(a.y, -1e7, 1e7),
    life: clamp(a.life, 0, 6)
  }));
  return { arcane: {
    mana: clamp(state.mana, 0, 250, 60),
    maxMana: clamp(state.maxMana, 1, 250, 100),
    blinkCharges: clamp(state.blinkCharges, 0, 4, 2),
    wardActive: Boolean(state.wardActive),
    blinkRecharge: clamp(state.blinkRecharge, 0, 5),
    blinkFx: state.blinkFx?.life > 0 ? {
      x1: clamp(state.blinkFx.x1,-1e7,1e7),
      y1: clamp(state.blinkFx.y1,-1e7,1e7),
      x2: clamp(state.blinkFx.x2,-1e7,1e7),
      y2: clamp(state.blinkFx.y2,-1e7,1e7),
      life: clamp(state.blinkFx.life,0,.32),maxLife:.32
    } : null,
    visual:(pilot.astraVisual||[]).slice(-24).map(fx=>({
      kind:fx.kind,
      x:clamp(fx.x,-1e7,1e7),y:clamp(fx.y,-1e7,1e7),
      x2:clamp(fx.x2,-1e7,1e7),y2:clamp(fx.y2,-1e7,1e7),
      radius:clamp(fx.radius,8,280),life:clamp(fx.life,0,3),
      maxLife:clamp(fx.maxLife,.01,3)
    })),
    meteorCooldown: clamp(state.cooldowns?.meteor, 0, 30),
    wardCooldown: clamp(state.cooldowns?.ward, 0, 30),
    wardRemaining: clamp(state.wardRemaining, 0, 10),
    wardX: clamp(state.wardX, -1e7, 1e7),
    wardY: clamp(state.wardY, -1e7, 1e7),
    shield: clamp(pilot.coopShield?.value, 0, 45),
    anchors
  } };
});
