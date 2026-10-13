/* Visual-only, bounded event timeline. Combat runs on the authoritative host;
 * clients draw copies of these lightweight primitives from room snapshots. */
const NeonAstraVisual = (() => {
  const MAX_FX = 24;
  function emit(pilot, kind, a, b = null, radius = 45, duration = .35) {
    if (!pilot || !a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return;
    const fx = pilot.astraVisual ||= [];
    if (fx.length >= MAX_FX) fx.shift();
    fx.push({kind, x:a.x, y:a.y,
      x2:Number.isFinite(b?.x)?b.x:a.x,
      y2:Number.isFinite(b?.y)?b.y:a.y,
      radius:Math.min(280,Math.max(8,radius)),
      life:duration,maxLife:duration});
  }
  function tick(pilot,dt) {
    if (!Number.isFinite(dt)||dt<=0) return;
    const fx=pilot?.astraVisual||[];
    for(let i=fx.length-1;i>=0;i--) {
      fx[i].life-=dt;
      if(fx[i].life<=0)fx.splice(i,1);
    }
  }
  function draw(ctx,entries) {
    if(!ctx||!Array.isArray(entries))return;
    ctx.save();ctx.lineCap='round';
    for(const f of entries.slice(0,MAX_FX)) {
      if(!f||!(f.life>0)||!Number.isFinite(f.x)||!Number.isFinite(f.y))continue;
      const alpha=Math.min(1,f.life/Math.max(.01,f.maxLife||.35));
      const radius=Math.min(280,Math.max(8,f.radius||45));
      ctx.globalAlpha=.8*alpha;
      ctx.strokeStyle=f.kind==='danger'?'#ff668d':f.kind==='shield'?'#85f5ff':'#bb8aff';
      ctx.fillStyle=f.kind==='danger'?'#ff668d':'#d9a6ff';
      ctx.shadowBlur=8;ctx.shadowColor=ctx.strokeStyle;
      if(['beam','chain','bolt','orb','echo'].includes(f.kind)) {
        ctx.lineWidth=f.kind==='beam'?9:4;
        ctx.beginPath();ctx.moveTo(f.x,f.y);
        ctx.lineTo(f.x2,f.y2);ctx.stroke();
        ctx.beginPath();ctx.arc(f.x2,f.y2,Math.min(14,radius*.18),0,Math.PI*2);ctx.fill();
      } else if(f.kind==='shield') {
        const r=radius*(0.55+0.45*(1-alpha));
        ctx.lineWidth=4.5;
        ctx.strokeStyle='#67e8f9';
        ctx.shadowBlur=16;ctx.shadowColor='#38bdf8';
        ctx.beginPath();ctx.arc(f.x,f.y,r,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=.22*alpha;
        ctx.fillStyle='#38bdf8';
        ctx.beginPath();ctx.arc(f.x,f.y,r,0,Math.PI*2);ctx.fill();
      } else {
        ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(f.x,f.y,
          f.kind==='telegraph'?radius:radius*(1-.7*alpha),0,Math.PI*2);ctx.stroke();
        if(f.kind==='burst') {
          ctx.globalAlpha=.16*alpha;
          ctx.beginPath();ctx.arc(f.x,f.y,radius*(1-.7*alpha),0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  return Object.freeze({emit,tick,draw,MAX_FX});
})();
window.NeonAstraVisual=NeonAstraVisual;
function drawAstraBlink(ctx, fx) {
  if (!fx || !ctx || !(fx.life > 0)) return;
  const fade = Math.min(1, fx.life / Math.max(.01, fx.maxLife || .32));
  const dx = fx.x2 - fx.x1;
  const dy = fx.y2 - fx.y1;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round';

  // 1. Wide ethereal astral fracture tunnel
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.38)';
  ctx.lineWidth = 26 * fade + 6;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(fx.x1, fx.y1);
  ctx.lineTo(fx.x2, fx.y2);
  ctx.stroke();

  // 2. Cyan-violet prismatic middle stream
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 9 * fade + 2;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(fx.x1, fx.y1);
  ctx.lineTo(fx.x2, fx.y2);
  ctx.stroke();

  // 3. High-intensity white starlight core beam
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5 * fade + 1;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(fx.x1, fx.y1);
  ctx.lineTo(fx.x2, fx.y2);
  ctx.stroke();

  // 4. Astral hull ghost echo at origin + 3 warp chevrons along tunnel
  for (let step = 0; step <= 3; step++) {
    const t = step / 4;
    const px = fx.x1 + dx * t;
    const py = fx.y1 + dy * t;
    const scale = 0.72 + 0.25 * t;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.scale(scale, scale);
    ctx.globalAlpha = fade * (0.65 - step * 0.12);
    ctx.strokeStyle = step === 0 ? '#e9d5ff' : '#38bdf8';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 5. Dimensional gateway ripple rings at origin and destination
  for (const [x, y, isDest] of [[fx.x1, fx.y1, false], [fx.x2, fx.y2, true]]) {
    const ringRadius = (isDest ? 16 : 12) + 32 * (1 - fade);
    ctx.strokeStyle = isDest ? '#67e8f9' : '#d8b4fe';
    ctx.lineWidth = isDest ? 2.6 : 2;
    ctx.shadowColor = isDest ? '#38bdf8' : '#c084fc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. Destination starburst 8-point diamond flare
  const flareSize = 18 * fade;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#67e8f9';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(fx.x2, fx.y2 - flareSize);
  ctx.lineTo(fx.x2 + flareSize * 0.32, fx.y2 - flareSize * 0.32);
  ctx.lineTo(fx.x2 + flareSize, fx.y2);
  ctx.lineTo(fx.x2 + flareSize * 0.32, fx.y2 + flareSize * 0.32);
  ctx.lineTo(fx.x2, fx.y2 + flareSize);
  ctx.lineTo(fx.x2 - flareSize * 0.32, fx.y2 + flareSize * 0.32);
  ctx.lineTo(fx.x2 - flareSize, fx.y2);
  ctx.lineTo(fx.x2 - flareSize * 0.32, fx.y2 - flareSize * 0.32);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
window.NeonShips.registerEffects('astra', {
  pilot(ctx, pilot) {
    window.NeonAstra?.renderMeteorZones(ctx, pilot);
    drawAstraBlink(ctx,pilot?.astra?.blinkFx);
    NeonAstraVisual.draw(ctx,pilot?.astraVisual);
    window.NeonAstra?.renderWard(ctx, pilot);
    window.NeonAstraWeave?.render(ctx, pilot);
    window.NeonAstra?.renderShield(ctx, pilot);
  },
  network(ctx, snapshot) {
    const arcane = snapshot.arcane;
    if (arcane?.meteorZones?.length) {
      window.NeonAstra?.renderMeteorZones(ctx, {
        shipId: 'astra',
        astra: { meteorZones: arcane.meteorZones }
      });
    }
    drawAstraBlink(ctx,arcane?.blinkFx);
    NeonAstraVisual.draw(ctx,arcane?.visual);
    if (arcane?.wardRemaining > 0) {
      window.NeonAstra?.renderWard(ctx, {
        shipId: 'astra',
        astra: {
          wardX: arcane.wardX,
          wardY: arcane.wardY,
          wardRemaining: arcane.wardRemaining
        },
        passives: snapshot.passives || {}
      });
    }
    if (arcane?.anchors?.length) {
      window.NeonAstraWeave?.render(ctx, { starWeave: { anchors: arcane.anchors } });
    }
    if ((arcane?.tempShield > 0 && arcane?.tempShieldRemaining > 0) || arcane?.phaseVeilRemaining > 0) {
      window.NeonAstra?.renderShield(ctx, {
        shipId: 'astra',
        x: snapshot.x,
        y: snapshot.y,
        downed: snapshot.downed,
        astraTempShield: arcane.tempShield > 0 ? {
          value: arcane.tempShield,
          remaining: arcane.tempShieldRemaining
        } : null,
        astra: { phaseVeilRemaining: arcane.phaseVeilRemaining || 0 }
      });
    }
  }
});
