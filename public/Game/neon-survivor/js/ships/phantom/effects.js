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
      ctx.globalAlpha=alpha*.85;
      ctx.strokeStyle=event.kind==='soul'?'#ef88ff':event.kind==='heal'?'#66ffcb':'#9b55ee';
      ctx.fillStyle=event.kind==='heal'?'#66ffcb':'#b779f7';
      ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=9;
      if(['dart','orb','beam','clone','soul'].includes(event.kind)) {
        ctx.lineWidth=event.kind==='beam'?8:3;
        ctx.beginPath();ctx.moveTo(event.x,event.y);
        ctx.lineTo(event.x2,event.y2);ctx.stroke();
        ctx.beginPath();ctx.arc(event.x2,event.y2,Math.min(12,radius*.2),0,Math.PI*2);ctx.fill();
      } else {
        ctx.lineWidth=event.kind==='heal'?4:3;
        ctx.beginPath();ctx.arc(event.x,event.y,
          event.kind==='telegraph'?radius:radius*(1-.65*alpha),0,Math.PI*2);ctx.stroke();
        if(event.kind==='burst') {
          ctx.globalAlpha=.13*alpha;
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
  if (!trail.length && !(spectral.reapFlash > 0) && !(spectral.shiftFlash > 0)) return;
  ctx.save();
  ctx.lineCap = 'round';

  // 1. Ghostly Silhouette Trail & Spatial Tear Ribbon
  for (let i = 0; i < trail.length; i++) {
    const point = trail[i];
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const fade = Math.min(1, Math.max(0, (point.life || 0) / .42));

    // Spatial tear connecting ribbon
    if (i > 0) {
      const prev = trail[i - 1];
      ctx.globalAlpha = fade * 0.45;
      ctx.strokeStyle = i % 2 === 0 ? '#00f0ff' : '#a855f7';
      ctx.lineWidth = 3 + fade * 8;
      ctx.shadowBlur = 12;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    // Ghostly Hull Silhouette Echo on prominent trail nodes
    if (i % 2 === 0) {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = 'rgba(19, 8, 38, 0.4)';
      ctx.strokeStyle = i % 4 === 0 ? '#00f0ff' : '#c084fc';
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;

      // Miniature chevron ghost silhouette
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -11);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Ethereal soul ember at trail point
    ctx.globalAlpha = fade * 0.7;
    ctx.fillStyle = i % 2 ? '#a855f7' : '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4 + fade * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Void Phase Detonation / Reap Nova Shockwave
  const pulse = spectral.reapFlash > 0 ? spectral.reapFlash : spectral.shiftFlash;
  if (pulse > 0 && Number.isFinite(spectral.x) && Number.isFinite(spectral.y)) {
    const isReap = spectral.reapFlash > 0;
    ctx.globalAlpha = Math.min(0.95, pulse * 3.2);
    ctx.strokeStyle = isReap ? '#ef88ff' : '#00f0ff';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    ctx.lineWidth = isReap ? 4.5 : 3.0;

    const ringR = 25 + (1 - pulse / .28) * 75;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner secondary echo ring
    ctx.strokeStyle = isReap ? '#ffffff' : '#a855f7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
window.NeonShips.registerEffects('phantom', {
  pilot(ctx, pilot) {
    if(pilot?.phantom)drawPhantomShift(ctx,{
      ...pilot.phantom,x:pilot.x,y:pilot.y
    });
    NeonPhantomVisual.draw(ctx,pilot?.phantomVisual);
    window.NeonPhantomScythe?.render(ctx, pilot);
  },
  world(ctx, game) {
    window.NeonPhantom?.renderMarks(ctx, game);
  },
  network(ctx, snapshot) {
    drawPhantomShift(ctx,{
      ...snapshot.spectral,x:snapshot.x,y:snapshot.y
    });
    NeonPhantomVisual.draw(ctx,snapshot.spectral?.visual);
    if (snapshot.spectral?.scythes?.length) {
      window.NeonPhantomScythe?.render(ctx, {
        phantomScythe: {scythes:snapshot.spectral.scythes}
      });
    }
  }
});
