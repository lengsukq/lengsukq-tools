const NeonPhantomVisual = (() => {
  const MAX_FX=24;
  function emit(pilot,kind,from,to=null,radius=50,duration=.32) {
    if(!pilot||!Number.isFinite(from?.x)||!Number.isFinite(from?.y))return;
    const timeline=pilot.phantomVisual ||= [];
    if(timeline.length>=MAX_FX)timeline.shift();
    timeline.push({kind,x:from.x,y:from.y,
      x2:Number.isFinite(to?.x)?to.x:from.x,
      y2:Number.isFinite(to?.y)?to.y:from.y,
      radius:Math.max(8,Math.min(280,radius)),life:duration,maxLife:duration});
  }
  function tick(pilot,dt) {
    if(!Number.isFinite(dt)||dt<=0)return;
    const events=pilot?.phantomVisual || [];
    for(let i=events.length-1;i>=0;i--){
      events[i].life-=dt;
      if(events[i].life<=0)events.splice(i,1);
    }
  }
  function draw(ctx,events) {
    if(!ctx||!Array.isArray(events))return;
    ctx.save();ctx.lineCap='round';
    for(const event of events.slice(0,MAX_FX)){
      if(!event||!(event.life>0)||!Number.isFinite(event.x)||!Number.isFinite(event.y))continue;
      const alpha=Math.min(1,event.life/Math.max(.01,event.maxLife || .32));
      const radius=Math.max(8,Math.min(280,event.radius||50));
      ctx.globalAlpha=alpha*.88;
      ctx.strokeStyle=event.kind==='soul'?'#ef88ff':event.kind==='heal'?'#66ffcb':'#9b55ee';
      ctx.fillStyle=event.kind==='heal'?'#66ffcb':'#b779f7';

      if (event.kind === 'strike_wave') {
        const dx = (event.x2 || event.x) - event.x;
        const dy = (event.y2 || event.y) - event.y;
        const dist = Math.max(40, Math.hypot(dx, dy));
        const ang = Math.atan2(dy, dx);
        const progress = 1 - alpha;
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(ang);
        // Sweeping spectral slash cone fill
        ctx.globalAlpha = alpha * 0.22;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, dist * (0.45 + 0.55 * progress), -0.42, 0.42);
        ctx.closePath();
        ctx.fill();
        // Triple crescent spectral blade waves (layered luminous strokes, 0 shadowBlur)
        for (let k = 0; k < 3; k++) {
          const waveR = dist * Math.min(1, 0.28 + k * 0.26 + progress * 0.36);
          const baseColor = k === 0 ? '#00f0ff' : k === 1 ? '#e879f9' : '#a855f7';
          // Outer glow pass
          ctx.globalAlpha = alpha * (0.45 - k * 0.1);
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = (4.5 - k * 1.1) * 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, waveR, -0.44 + k * 0.05, 0.44 - k * 0.05);
          ctx.stroke();
          // Inner sharp core pass
          ctx.globalAlpha = alpha * (0.95 - k * 0.2);
          ctx.lineWidth = 4.5 - k * 1.1;
          ctx.beginPath();
          ctx.arc(0, 0, waveR, -0.44 + k * 0.05, 0.44 - k * 0.05);
          ctx.stroke();
        }
        // Central piercing spine beam
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(dist * (0.6 + 0.4 * progress), 0);
        ctx.stroke();
        ctx.restore();
      } else if (event.kind === 'reap_slash') {
        // High-contrast soul execution tether + crimson/violet X-slash at target (0 shadowBlur)
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
        ctx.lineWidth = (2.6 * alpha + 1) * 2.2;
        ctx.beginPath();
        ctx.moveTo(event.x, event.y);
        ctx.lineTo(event.x2, event.y2);
        ctx.stroke();
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 2.6 * alpha + 1;
        ctx.beginPath();
        ctx.moveTo(event.x, event.y);
        ctx.lineTo(event.x2, event.y2);
        ctx.stroke();

        const slashLen = 14 + (1 - alpha) * 12;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.moveTo(event.x2 - slashLen, event.y2 - slashLen);
        ctx.lineTo(event.x2 + slashLen, event.y2 + slashLen);
        ctx.moveTo(event.x2 + slashLen, event.y2 - slashLen);
        ctx.lineTo(event.x2 - slashLen, event.y2 + slashLen);
        ctx.stroke();

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(event.x2 - slashLen, event.y2 - slashLen);
        ctx.lineTo(event.x2 + slashLen, event.y2 + slashLen);
        ctx.moveTo(event.x2 + slashLen, event.y2 - slashLen);
        ctx.lineTo(event.x2 - slashLen, event.y2 + slashLen);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(event.x2, event.y2, 4 * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (event.kind === 'repel') {
        const progress = 1 - alpha;
        const currentR = radius * (0.35 + 0.65 * progress);
        // Outer glow halo
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 6.4;
        ctx.beginPath();
        ctx.arc(event.x, event.y, currentR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner crisp neon ring
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(event.x, event.y, currentR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.18 * alpha;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(event.x, event.y, radius * (0.2 + 0.8 * progress), 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.75 * alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        for (let sp = 0; sp < 8; sp++) {
          const spAng = (sp * Math.PI) / 4 + progress * 0.4;
          const r1 = radius * 0.45;
          const r2 = radius * (0.7 + 0.3 * progress);
          ctx.beginPath();
          ctx.moveTo(event.x + Math.cos(spAng) * r1, event.y + Math.sin(spAng) * r1);
          ctx.lineTo(event.x + Math.cos(spAng) * r2, event.y + Math.sin(spAng) * r2);
          ctx.stroke();
        }
      } else if (event.kind === 'vortex') {
        const currentR = radius * (0.35 + 0.65 * alpha);
        // Outer violet glow
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.lineWidth = 6.0;
        ctx.beginPath();
        ctx.arc(event.x, event.y, currentR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner sharp purple ring
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(event.x, event.y, currentR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.16 * alpha;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(event.x, event.y, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if(['dart','orb','beam','clone','soul'].includes(event.kind)) {
        ctx.lineWidth=event.kind==='beam'?8:3;
        ctx.beginPath();ctx.moveTo(event.x,event.y);
        ctx.lineTo(event.x2,event.y2);ctx.stroke();
        ctx.beginPath();ctx.arc(event.x2,event.y2,Math.min(12,radius*.2),0,Math.PI*2);ctx.fill();
      } else {
        ctx.lineWidth=event.kind==='heal'?4:3;
        ctx.beginPath();ctx.arc(event.x,event.y,
          event.kind==='telegraph'?radius:radius*(1-.65*alpha),0,Math.PI*2);ctx.stroke();
        if(event.kind==='burst') {
          ctx.globalAlpha=.15*alpha;
          ctx.beginPath();ctx.arc(event.x,event.y,radius*(1-.65*alpha),0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  return Object.freeze({emit,tick,draw,MAX_FX});
})();
window.NeonPhantomVisual=NeonPhantomVisual;
function drawPhantomShift(ctx, spectral) {
  if (!ctx || !spectral) return;
  const trail = Array.isArray(spectral.shiftTrail) ? spectral.shiftTrail.slice(0, 10) : [];
  const active = Boolean(spectral.shiftActive);
  const sprinting = (spectral.sprintTimer || 0) > 0;
  const vortexing = (spectral.vortexTimer || 0) > 0;
  if (!trail.length && !active && !sprinting && !vortexing && !(spectral.reapFlash > 0) && !(spectral.shiftFlash > 0)) return;
  const nowSec = (typeof performance !== 'undefined' ? performance.now() : 0) * 0.001;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Smooth Continuous Dual-Layer Void Ribbon (connecting trail nodes all the way to current hull)
  const validPts = trail.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  if (Number.isFinite(spectral.x) && Number.isFinite(spectral.y) && (active || sprinting)) {
    const last = validPts[validPts.length - 1];
    if (!last || Math.hypot(spectral.x - last.x, spectral.y - last.y) > 2) {
      validPts.push({
        x: spectral.x,
        y: spectral.y,
        angle: Number.isFinite(spectral.aimAngle) ? spectral.aimAngle : (last?.angle || 0),
        life: 0.44,
        seq: (last?.seq || 0) + 1,
        isHead: true
      });
    }
  }

  if (validPts.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(validPts[0].x, validPts[0].y);
    for (let i = 1; i < validPts.length; i++) {
      ctx.lineTo(validPts[i].x, validPts[i].y);
    }
    // Outer abyssal violet plasma wake (zero shadowBlur, ultra smooth)
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 9;
    ctx.stroke();

    // Inner high-velocity cyan soul filament
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // 2. Oriented Spectral Hull Afterimages (using stable point.seq so colors/silhouettes never flicker!)
  for (let i = 0; i < trail.length; i++) {
    const point = trail[i];
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const fade = Math.min(1, Math.max(0, (point.life || 0) / 0.44));
    const seq = Number.isFinite(point.seq) ? point.seq : i;
    const isCyan = seq % 2 === 0;
    const scale = 0.62 + 0.34 * fade;
    const fallbackAng = i > 0 && Number.isFinite(trail[i - 1]?.x)
      ? Math.atan2(point.y - trail[i - 1].y, point.x - trail[i - 1].x)
      : 0;
    const ang = Number.isFinite(point.angle) ? point.angle : fallbackAng;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(ang);
    ctx.scale(scale, scale);
    ctx.globalAlpha = fade * 0.56;
    ctx.fillStyle = isCyan ? 'rgba(0, 240, 255, 0.16)' : 'rgba(168, 85, 247, 0.20)';
    ctx.strokeStyle = isCyan ? '#00f0ff' : '#c084fc';
    ctx.lineWidth = 1.6;

    // Authentic Phantom twin-mandible gull-wing wraith silhouette
    ctx.beginPath();
    ctx.moveTo(22, -3.5);
    ctx.lineTo(17, 0);
    ctx.lineTo(22, 3.5);
    ctx.lineTo(2, 8);
    ctx.lineTo(-6, 19);
    ctx.lineTo(-13, 15);
    ctx.lineTo(-9, 5);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-9, -5);
    ctx.lineTo(-13, -15);
    ctx.lineTo(-6, -19);
    ctx.lineTo(2, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 3. Active Wraith Cloak Shroud & Orbiting Shadow Blades around Ship (while shiftActive is true)
  if (active && Number.isFinite(spectral.x) && Number.isFinite(spectral.y)) {
    const x = spectral.x;
    const y = spectral.y;
    const shroudR = 28 + Math.sin(nowSec * 9) * 2.2;

    ctx.save();
    ctx.translate(x, y);

    // Abyssal stealth distortion field
    ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(0, 0, shroudR + 5, 0, Math.PI * 2);
    ctx.fill();

    // Counter-rotating twin spectral crescent blades
    for (let b = 0; b < 2; b++) {
      const rot = nowSec * 5.2 + b * Math.PI;
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = b === 0 ? 'rgba(0, 240, 255, 0.35)' : 'rgba(192, 132, 252, 0.35)';
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.arc(0, 0, shroudR, -0.58, 0.58);
      ctx.stroke();
      ctx.strokeStyle = b === 0 ? '#00f0ff' : '#c084fc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, shroudR, -0.58, 0.58);
      ctx.stroke();
      ctx.restore();
    }

    // Remaining stealth / ectoplasm progress ring
    const maxRem = Math.max(1.6, spectral.shiftMaxDuration || 2.1);
    const ratio = Math.max(0.06, Math.min(1, (spectral.shiftRemaining || 0) / maxRem));
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.arc(0, 0, shroudR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, shroudR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();

    ctx.restore();
  }

  // 3b. Player-Following Void Field (when [K] is active: stealth = inward vortex / non-stealth = outward repulsion)
  if (vortexing && Number.isFinite(spectral.x) && Number.isFinite(spectral.y)) {
    const vx = spectral.x;
    const vy = spectral.y;
    const isShift = Boolean(spectral.shiftActive);

    ctx.save();
    ctx.translate(vx, vy);

    if (isShift) {
      // 潜行状态：大范围引力内聚漩涡 (半径 220px)
      const vR = 220;
      const pullCycle = (nowSec * 1.8) % 1;
      const collapseR = vR * (1 - pullCycle * 0.72);

      // Outer boundary ring (dual pass)
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.arc(0, 0, vR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, vR, 0, Math.PI * 2);
      ctx.stroke();

      // Collapsing gravity suction wave ring
      ctx.globalAlpha = (1 - pullCycle) * 0.35;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(0, 0, collapseR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - pullCycle) * 0.85;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, collapseR, 0, Math.PI * 2);
      ctx.stroke();

      // 6 Rotating inward spiral gravity arms
      for (let arm = 0; arm < 6; arm++) {
        const a = -nowSec * 4.2 + (arm * Math.PI) / 3;
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = arm % 2 === 0 ? '#00f0ff' : '#d946ef';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, vR * 0.55, a, a + 0.65);
        ctx.stroke();
      }
    } else {
      // 非潜行状态：较小范围排斥冲击力场 (半径 135px)
      const rR = 135;
      const pushCycle = (nowSec * 2.2) % 1;
      const expandR = rR * (0.28 + pushCycle * 0.72);

      // Boundary shield ring (dual pass)
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      ctx.arc(0, 0, rR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, rR, 0, Math.PI * 2);
      ctx.stroke();

      // Outward expanding repulsion wave ring (dual pass)
      ctx.globalAlpha = (1 - pushCycle) * 0.35;
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 6.4;
      ctx.beginPath();
      ctx.arc(0, 0, expandR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - pushCycle) * 0.88;
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, expandR, 0, Math.PI * 2);
      ctx.stroke();

      // Outward kinetic force arrows
      for (let arm = 0; arm < 6; arm++) {
        const a = nowSec * 2.5 + (arm * Math.PI) / 3;
        ctx.globalAlpha = 0.52 * (1 - pushCycle * 0.5);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.0;
        const p1 = rR * 0.42;
        const p2 = rR * 0.92;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * p1, Math.sin(a) * p1);
        ctx.lineTo(Math.cos(a) * p2, Math.sin(a) * p2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // 4. Void Phase Detonation / Reap Nova Shockwave
  const pulse = spectral.reapFlash > 0 ? spectral.reapFlash : spectral.shiftFlash;
  if (pulse > 0 && Number.isFinite(spectral.x) && Number.isFinite(spectral.y)) {
    const isReap = spectral.reapFlash > 0;
    const ringR = 25 + (1 - pulse / .28) * 85;

    // Outer soft shockwave ring
    ctx.globalAlpha = Math.min(0.45, pulse * 1.5);
    ctx.strokeStyle = isReap ? '#ef88ff' : '#00f0ff';
    ctx.lineWidth = isReap ? 9.0 : 6.5;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright core ring
    ctx.globalAlpha = Math.min(0.95, pulse * 3.2);
    ctx.lineWidth = isReap ? 3.8 : 2.4;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner secondary echo ring
    ctx.strokeStyle = isReap ? '#ffffff' : '#a855f7';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
window.NeonShips.registerEffects('phantom', {
  pilot(ctx, pilot) {
    if(pilot?.phantom)drawPhantomShift(ctx,{
      ...pilot.phantom,x:pilot.x,y:pilot.y,aimAngle:pilot.aimAngle
    });
    NeonPhantomVisual.draw(ctx,pilot?.phantomVisual);
    window.NeonPhantomScythe?.render(ctx, pilot);
  },
  world(ctx, game) {
    window.NeonPhantom?.renderMarks(ctx, game);
  },
  network(ctx, snapshot) {
    drawPhantomShift(ctx,{
      ...snapshot.spectral,x:snapshot.x,y:snapshot.y,aimAngle:snapshot.aimAngle
    });
    NeonPhantomVisual.draw(ctx,snapshot.spectral?.visual);
    if (snapshot.spectral?.scythes?.length) {
      window.NeonPhantomScythe?.render(ctx, {
        phantomScythe: {scythes:snapshot.spectral.scythes}
      });
    }
  }
});
