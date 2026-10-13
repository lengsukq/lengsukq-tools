/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('phantom', (ctx, fighter, profile) => {
  const mainColor = profile.color || '#00f0ff';
  const downed = Boolean(fighter.downed);
  const strokeColor = downed ? '#ff617e' : mainColor;
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const timeSec = now * 0.001;

  ctx.save();

  // 1. Dual-mandible predatory stealth hull (Forked needle prongs)
  ctx.fillStyle = downed ? '#1a0d18' : '#0e051c';

  ctx.beginPath();
  ctx.moveTo(26, -4.5);           // Port forward strike fang
  ctx.lineTo(21, 0);              // Central notch
  ctx.lineTo(26, 4.5);            // Starboard forward strike fang
  ctx.lineTo(14, 9);
  ctx.lineTo(2, 10);
  ctx.lineTo(-6, 24);             // Swept stealth gull wing starboard
  ctx.lineTo(-14, 20);
  ctx.lineTo(-9, 7);
  ctx.lineTo(-16, 3);
  ctx.lineTo(-12, 0);             // Tail keel
  ctx.lineTo(-16, -3);
  ctx.lineTo(-9, -7);
  ctx.lineTo(-14, -20);
  ctx.lineTo(-6, -24);            // Swept stealth gull wing port
  ctx.lineTo(2, -10);
  ctx.lineTo(14, -9);
  ctx.closePath();
  ctx.fill();

  // Outer luminous glow pass (0 shadowBlur)
  ctx.strokeStyle = downed ? 'rgba(255,97,126,0.35)' : 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 5.4;
  ctx.stroke();

  // Sharp inner contour
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 2. Negative-space void vents (Hollow energy conduits inside wings)
  const ventAlpha = downed ? 0.25 : (0.35 + Math.sin(timeSec * 5) * 0.15);
  ctx.fillStyle = downed ? 'rgba(255,97,126,0.3)' : `rgba(0, 240, 255, ${ventAlpha})`;
  ctx.strokeStyle = downed ? '#ff617e' : 'rgba(0, 240, 255, 0.85)';
  ctx.lineWidth = 1.2;

  // Port void vent
  ctx.beginPath();
  ctx.moveTo(1, -8);
  ctx.lineTo(-7, -18);
  ctx.lineTo(-10, -13);
  ctx.lineTo(-5, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Starboard void vent
  ctx.beginPath();
  ctx.moveTo(1, 8);
  ctx.lineTo(-7, 18);
  ctx.lineTo(-10, 13);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Symbiote docking nodes (Tactical bioclamps on wings)
  ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
  ctx.beginPath();
  ctx.arc(-4, -13, 2.4, 0, Math.PI * 2);
  ctx.arc(-4, 13, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // 4. Central Ocular Soul Core (Eerie spectral eye with breathing slit pupil)
  const eyePulse = downed ? 0 : Math.sin(timeSec * 4) * 0.6;
  ctx.beginPath();
  ctx.arc(3, 0, 5.8 + eyePulse, 0, Math.PI * 2);
  ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
  ctx.fill();
  ctx.strokeStyle = downed ? '#ff617e' : '#c084fc';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Sinister vertical slit pupil with ocular gleam
  if (!downed) {
    const slitWidth = 1.6 + Math.sin(timeSec * 6) * 0.4;
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(3, 0, slitWidth, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil bright pinpoint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Twin Ethereal Phosphor Exhaust Plumes (Cyan plasma & violet soul flames)
  const plume = downed ? 4 : (10 + Math.random() * 8);
  const thrusterColor = downed ? '#ff617e' : '#00f0ff';
  ctx.fillStyle = thrusterColor;

  // Port engine flame
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.lineTo(-13 - plume, -7);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fill();

  // Starboard engine flame
  ctx.beginPath();
  ctx.moveTo(-13, 6);
  ctx.lineTo(-13 - plume, 7);
  ctx.lineTo(-10, 4);
  ctx.closePath();
  ctx.fill();

  // Ethereal violet soul-fire overlayer & drifting smoke sparks
  if (!downed) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.75)';

    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-12 - plume * 0.7, -4.5);
    ctx.lineTo(-10, -2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(-12 - plume * 0.7, 4.5);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();

    // Trailing spectral sparks
    const sparkT = (now * 0.04) % 10;
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(-17 - sparkT, -5 + Math.sin(timeSec * 7) * 2, 1.3, 0, Math.PI * 2);
    ctx.arc(-17 - sparkT, 5 + Math.cos(timeSec * 7) * 2, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
});
