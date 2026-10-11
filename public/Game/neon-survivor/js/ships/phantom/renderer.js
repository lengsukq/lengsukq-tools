/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('phantom', (ctx, fighter, profile) => {
    const mainColor = profile.color || '#00f0ff';
    const downed = Boolean(fighter.downed);
    const strokeColor = downed ? '#ff617e' : mainColor;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;

    // 1. Dual-mandible predatory stealth hull (forked needle prongs)
    ctx.fillStyle = '#130826';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(25, -4);             // Port forward strike fang
    ctx.lineTo(21, 0);              // Central notch
    ctx.lineTo(25, 4);              // Starboard forward strike fang
    ctx.lineTo(14, 9);
    ctx.lineTo(2, 10);
    ctx.lineTo(-6, 23);             // Swept stealth gull wing right
    ctx.lineTo(-14, 19);
    ctx.lineTo(-9, 7);
    ctx.lineTo(-16, 3);
    ctx.lineTo(-12, 0);             // Tail keel
    ctx.lineTo(-16, -3);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-14, -19);
    ctx.lineTo(-6, -23);            // Swept stealth gull wing left
    ctx.lineTo(2, -10);
    ctx.lineTo(14, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Negative-space void vents (hollow energy conduits inside the wings)
    ctx.fillStyle = downed ? 'rgba(255,97,126,0.3)' : 'rgba(0,240,255,0.25)';
    ctx.strokeStyle = downed ? '#ff617e' : 'rgba(0,240,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-8, -17);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-5, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(-8, 17);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Symbiote docking nodes (tactical clamp anchors on wings)
    ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.arc(-4, -13, 2.0, 0, Math.PI * 2);
    ctx.arc(-4, 13, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Central ocular soul core (spectral eye)
    ctx.beginPath();
    ctx.arc(3, 0, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#a855f7';
    ctx.fill();

    // Vertical slit pupil ocular gleam
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(3, 0, 1.8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Twin ethereal phosphor exhaust plumes
    const plume = downed ? 4 : (9 + Math.random() * 7);
    ctx.fillStyle = downed ? '#ff617e' : '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(-13 - plume, -7);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-13, 6);
    ctx.lineTo(-13 - plume, 7);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    // Violet trailing sparks
    if (!downed) {
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(-17 - plume * 0.7, -4, 1.4, 0, Math.PI * 2);
      ctx.arc(-17 - plume * 0.7, 4, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
