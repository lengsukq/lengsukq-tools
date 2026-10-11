/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('astra', (ctx, fighter, profile) => {
    const mainColor = profile.color || '#b69aff';
    const downed = Boolean(fighter.downed);
    const strokeColor = downed ? '#ff617e' : mainColor;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;

    // 1. Celestial astrolabe halo ring suspended behind the starship
    ctx.strokeStyle = downed ? 'rgba(255,97,126,0.45)' : 'rgba(182,154,255,0.6)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-8, 0, 19, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.stroke();

    // Celestial orbit motes
    ctx.fillStyle = downed ? '#ff617e' : '#e4d8ff';
    ctx.shadowColor = '#e4d8ff';
    ctx.beginPath();
    ctx.arc(-18, -13, 2.2, 0, Math.PI * 2);
    ctx.arc(-18, 13, 2.2, 0, Math.PI * 2);
    ctx.arc(-26, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main star-shuttle crystalline hull
    ctx.fillStyle = '#110a26';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = strokeColor;
    ctx.beginPath();
    ctx.moveTo(27, 0);              // Slender astral spearhead
    ctx.lineTo(8, -6);
    ctx.lineTo(-4, -13);
    ctx.lineTo(-18, -23);           // Swept ethereal wing left
    ctx.lineTo(-14, -7);
    ctx.lineTo(-17, 0);             // Tail cusp
    ctx.lineTo(-14, 7);
    ctx.lineTo(-18, 23);            // Swept ethereal wing right
    ctx.lineTo(-4, 13);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Sacred geometric prism rune inlays
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = downed ? 'rgba(255,97,126,0.6)' : '#d5c4ff';
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(2, -5);
    ctx.lineTo(-10, 0);
    ctx.lineTo(2, 5);
    ctx.closePath();
    ctx.stroke();

    // 4. Central celestial singularity core
    ctx.beginPath();
    ctx.arc(3, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = downed ? '#ff617e' : '#cbbaff';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#d9b3ff';
    ctx.fill();

    // Radiant core inner focus
    ctx.beginPath();
    ctx.arc(3, 0, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 5. Stardust slipstream comet tails (ethereal propulsion)
    const drift = downed ? 4 : (9 + Math.random() * 7);
    ctx.strokeStyle = downed ? '#ff617e' : 'rgba(182,154,255,0.85)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#b69aff';
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(-16 - drift * 0.9, -6);
    ctx.moveTo(-17, 0);
    ctx.lineTo(-17 - drift * 1.3, 0);
    ctx.moveTo(-16, 4);
    ctx.lineTo(-16 - drift * 0.9, 6);
    ctx.stroke();

    ctx.restore();
  });
