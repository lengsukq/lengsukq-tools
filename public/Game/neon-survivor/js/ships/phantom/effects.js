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
  const trail = Array.isArray(spectral.shiftTrail) ? spectral.shiftTrail.slice(0,10) : [];
  if (!trail.length && !(spectral.reapFlash > 0) && !(spectral.shiftFlash > 0)) return;
  ctx.save();
  ctx.lineCap = 'round';
  for(let i=0;i<trail.length;i++) {
    const point=trail[i];
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
    const fade=Math.min(1,Math.max(0,(point.life||0)/.42));
    ctx.globalAlpha=fade*.48;
    ctx.fillStyle=i%2?'#7e3ad5':'#00f0ff';
    ctx.beginPath();
    ctx.arc(point.x,point.y,7+fade*9,0,Math.PI*2);
    ctx.fill();
    if(i) {
      const prev=trail[i-1];
      ctx.strokeStyle='#b967ff';
      ctx.lineWidth=2+fade*7;
      ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(point.x,point.y);ctx.stroke();
    }
  }
  const pulse=spectral.reapFlash>0?spectral.reapFlash:spectral.shiftFlash;
  if(pulse>0&&Number.isFinite(spectral.x)&&Number.isFinite(spectral.y)) {
    ctx.globalAlpha=Math.min(.9,pulse*3);
    ctx.strokeStyle=spectral.reapFlash>0?'#d38aff':'#00f0ff';
    ctx.shadowColor=ctx.strokeStyle;
    ctx.shadowBlur=14;
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(spectral.x,spectral.y,25+(1-pulse/.28)*65,0,Math.PI*2);ctx.stroke();
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
