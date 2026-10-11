/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('riftblade', (ctx, fighter, profile) => {
    const mainColor = profile.color || '#00f3ff';
    const downed = Boolean(fighter.downed);
    const strokeColor = downed ? '#ff617e' : mainColor;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;

    // 1. Main titanium assault chassis
    ctx.fillStyle = '#061122';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(26, 0);              // Sharp razor needle nose
    ctx.lineTo(8, -7);
    ctx.lineTo(-12, -22);           // Main wing tip left
    ctx.lineTo(-16, -18);
    ctx.lineTo(-9, -8);
    ctx.lineTo(-18, -8);           // Port thruster cowl
    ctx.lineTo(-18, -4);
    ctx.lineTo(-13, 0);            // Engine notch
    ctx.lineTo(-18, 4);            // Starboard thruster cowl
    ctx.lineTo(-18, 8);
    ctx.lineTo(-9, 8);
    ctx.lineTo(-16, 18);
    ctx.lineTo(-12, 22);           // Main wing tip right
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. High-tech panel groove inlays (accent armor plates)
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = downed ? 'rgba(255,97,126,0.6)' : 'rgba(0,243,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-4, -13);
    ctx.moveTo(14, 0);
    ctx.lineTo(-4, 13);
    ctx.moveTo(2, -4);
    ctx.lineTo(-11, -4);
    ctx.moveTo(2, 4);
    ctx.lineTo(-11, 4);
    ctx.stroke();

    // 3. Wingtip micro navigation lights
    ctx.fillStyle = downed ? '#ff617e' : '#fff';
    ctx.beginPath();
    ctx.arc(-13, -20, 1.6, 0, Math.PI * 2);
    ctx.arc(-13, 20, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Hexagonal crystalline cockpit
    ctx.fillStyle = downed ? '#ff617e' : strokeColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(1, -4.5);
    ctx.lineTo(-6, -4.5);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-6, 4.5);
    ctx.lineTo(1, 4.5);
    ctx.closePath();
    ctx.fill();

    // Cockpit reflection glint
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, -1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 5. Twin heavy vector thruster exhausts
    const flameBase = downed ? 4 : (11 + Math.random() * 8);
    ctx.fillStyle = downed ? '#ff617e' : '#ff007f';
    ctx.shadowColor = downed ? '#ff617e' : '#ff007f';
    ctx.shadowBlur = 16;

    // Port engine flame
    ctx.beginPath();
    ctx.moveTo(-18, -7);
    ctx.lineTo(-18 - flameBase, -6);
    ctx.lineTo(-18, -4);
    ctx.closePath();
    ctx.fill();

    // Starboard engine flame
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(-18 - flameBase, 6);
    ctx.lineTo(-18, 7);
    ctx.closePath();
    ctx.fill();

    // Core energetic white thrust plume center
    if (!downed) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-18, -6, 1.5, 0, Math.PI * 2);
      ctx.arc(-18, 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
