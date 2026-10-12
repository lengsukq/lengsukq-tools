/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('astra', (ctx, fighter, profile) => {
  const mainColor = profile.color || '#b69aff';
  const downed = Boolean(fighter.downed);
  const strokeColor = downed ? '#ff617e' : mainColor;
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const timeSec = now * 0.001;

  ctx.save();
  ctx.shadowBlur = downed ? 10 : 20;
  ctx.shadowColor = strokeColor;

  // 1. Dual-ring Celestial Astrolabe (Slowly counter-rotating mystical rings)
  if (!downed) {
    const ringAngle = timeSec * 0.9;
    ctx.save();
    ctx.translate(-7, 0);

    // Outer astrolabe ring with celestial tick marks
    ctx.strokeStyle = 'rgba(182, 154, 255, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    // 4 orbital tick markers on outer ring
    for (let i = 0; i < 4; i++) {
      const a = ringAngle + (i * Math.PI / 2);
      const rx = Math.cos(a) * 22;
      const ry = Math.sin(a) * 22;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#c4b5fd';
      ctx.beginPath();
      ctx.arc(rx, ry, i % 2 === 0 ? 1.8 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner counter-rotating astrolabe ring
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.55)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 15, -ringAngle * 1.3, -ringAngle * 1.3 + Math.PI * 1.6);
    ctx.stroke();

    // Orbiting celestial star motes
    const moteA = -ringAngle * 1.4;
    ctx.fillStyle = '#f5f3ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(Math.cos(moteA) * 15, Math.sin(moteA) * 15, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else {
    // Fractured dull ring when downed
    ctx.strokeStyle = 'rgba(255, 97, 126, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-7, 0, 20, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
  }

  // 2. Main star-shuttle crystalline hull (Layered astral armor)
  ctx.fillStyle = downed ? '#1a0d18' : '#120b29';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.4;
  ctx.shadowBlur = downed ? 8 : 16;
  ctx.shadowColor = strokeColor;

  ctx.beginPath();
  ctx.moveTo(28, 0);              // Astral spearhead
  ctx.lineTo(10, -6);
  ctx.lineTo(-3, -13);
  ctx.lineTo(-19, -24);           // Swept ethereal wing port
  ctx.lineTo(-14, -8);
  ctx.lineTo(-18, 0);             // Tail keel cusp
  ctx.lineTo(-14, 8);
  ctx.lineTo(-19, 24);            // Swept ethereal wing starboard
  ctx.lineTo(-3, 13);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Sacred geometric prism inlays & facet lines
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = downed ? 'rgba(255, 97, 126, 0.5)' : 'rgba(224, 204, 255, 0.85)';
  ctx.shadowBlur = 6;
  ctx.shadowColor = downed ? '#ff617e' : '#e0ccff';

  // Central diamond facet
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(3, -5.5);
  ctx.lineTo(-10, 0);
  ctx.lineTo(3, 5.5);
  ctx.closePath();
  ctx.stroke();

  // Wing crystal facet ribs
  ctx.beginPath();
  ctx.moveTo(3, -5.5);
  ctx.lineTo(-12, -18);
  ctx.moveTo(3, 5.5);
  ctx.lineTo(-12, 18);
  ctx.stroke();

  // Wingtip focus crystals
  ctx.fillStyle = downed ? '#ff617e' : '#f3e8ff';
  ctx.beginPath();
  ctx.arc(-17, -21, 1.8, 0, Math.PI * 2);
  ctx.arc(-17, 21, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 4. Central Celestial Singularity Core (Breathing radiance)
  const pulse = downed ? 0 : Math.sin(timeSec * 5) * 0.8;
  const coreRadius = 5.5 + pulse;

  ctx.beginPath();
  ctx.arc(3, 0, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
  ctx.shadowBlur = downed ? 6 : 18;
  ctx.shadowColor = downed ? '#ff617e' : '#c084fc';
  ctx.fill();

  // Radiant core inner focus
  ctx.beginPath();
  ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 5. Stardust Slipstream Comet Exhausts (Multi-tier ethereal propulsion)
  const drift = downed ? 4 : (11 + Math.random() * 8);
  const thrusterGlow = downed ? '#ff617e' : '#c084fc';

  // Primary celestial plasma comet tail
  ctx.strokeStyle = downed ? '#ff617e' : 'rgba(192, 132, 252, 0.9)';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = thrusterGlow;
  ctx.shadowBlur = 14;

  ctx.beginPath();
  ctx.moveTo(-17, -4);
  ctx.lineTo(-17 - drift * 0.9, -6);
  ctx.moveTo(-18, 0);
  ctx.lineTo(-18 - drift * 1.4, 0);
  ctx.moveTo(-17, 4);
  ctx.lineTo(-17 - drift * 0.9, 6);
  ctx.stroke();

  // Inner white starlight plume core
  if (!downed) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-18 - drift * 0.8, 0);
    ctx.stroke();

    // Drifting stardust sparkles behind ship
    const sparkOffset = (now * 0.05) % 12;
    ctx.fillStyle = 'rgba(233, 213, 255, 0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(-22 - sparkOffset, -3 + Math.sin(timeSec * 8) * 2, 1.2, 0, Math.PI * 2);
    ctx.arc(-26 - sparkOffset * 0.7, 3 + Math.cos(timeSec * 7) * 2, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
});
