/* Thunder Assault visual system. All artwork is drawn locally; no image requests or assets. */
(function () {
  'use strict';

  function hull(ctx, points, fill, rim, lineWidth = 1.4) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function line(ctx, points, color, width = 1) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function core(ctx, x, y, r, color, time = 0) {
    const pulse = 0.85 + Math.sin(time * 4) * 0.12;
    const bloom = ctx.createRadialGradient(x, y, 1, x, y, r * 2.6);
    bloom.addColorStop(0, '#ffffff');
    bloom.addColorStop(0.2, color);
    bloom.addColorStop(0.55, color + '88');
    bloom.addColorStop(1, color + '00');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaffff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEngine(ctx, x, y, time, color, size = 1) {
    const flicker = 0.85 + Math.sin(time * 25 + x) * 0.15;
    const plume = 16 * size * flicker;
    const flame = ctx.createLinearGradient(x, y, x, y + plume);
    flame.addColorStop(0, '#f8fdff');
    flame.addColorStop(0.26, color);
    flame.addColorStop(1, color + '00');
    hull(ctx, [[x - 4 * size, y], [x + 4 * size, y], [x + 2 * size, y + plume * 0.6], [x, y + plume], [x - 2 * size, y + plume * 0.6]], flame, color + '66', 0.7);
  }

  function fighter(ctx, x, y, type, tilt = 0, scale = 1, time = 0, preview = false) {
    const schemes = [
      { rim: '#50e8f5', shine: '#d4fbff', base: '#17314b', wing: '#295678', accent: '#15c8ee' },
      { rim: '#cda1fa', shine: '#fbebff', base: '#322b57', wing: '#56467a', accent: '#ad75ff' },
      { rim: '#ffc37b', shine: '#fff1d2', base: '#463e42', wing: '#746157', accent: '#ff974f' }
    ];
    const s = schemes[type] || schemes[0];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);
    ctx.shadowColor = s.accent;
    ctx.shadowBlur = preview ? 8 : 15;

    if (type === 0) {
      drawEngine(ctx, -11, 21, time, '#20bde9', 0.9);
      drawEngine(ctx, 11, 21, time, '#20bde9', 0.9);
      // Swept-back winglets, steel spine and armor are intentionally distinct layers.
      hull(ctx, [[-6,-15],[-17,-14],[-37,12],[-36,20],[-17,15],[-13,29],[-4,25]], s.wing, s.rim);
      hull(ctx, [[6,-15],[17,-14],[37,12],[36,20],[17,15],[13,29],[4,25]], s.wing, s.rim);
      hull(ctx, [[0,-40],[8,-25],[15,5],[11,25],[0,31],[-11,25],[-15,5],[-8,-25]], s.base, s.rim, 2);
      hull(ctx, [[0,-35],[5,-23],[7,6],[0,18],[-7,6],[-5,-23]], '#6aaac0', s.shine, 0.8);
      hull(ctx, [[-30,10],[-21,2],[-15,12],[-20,17]], '#a3d6e6', '#c7f9ff', 0.8);
      hull(ctx, [[30,10],[21,2],[15,12],[20,17]], '#a3d6e6', '#c7f9ff', 0.8);
      line(ctx, [[0,-31],[0,-10]], '#e9fbff', 1.7);
      core(ctx, 0, 5, 4.2, s.accent, time);
      [-22,22].forEach(px => core(ctx, px, 12, 1.8, '#66edff', time));
    } else if (type === 1) {
      drawEngine(ctx, 0, 25, time, '#a77bff', 1.15);
      drawEngine(ctx, -21, 17, time, '#cb9dff', 0.5);
      drawEngine(ctx, 21, 17, time, '#cb9dff', 0.5);
      hull(ctx, [[0,-42],[11,-19],[34,-14],[25,-1],[39,14],[26,24],[9,13],[0,28],[-9,13],[-26,24],[-39,14],[-25,-1],[-34,-14],[-11,-19]], s.wing, s.rim, 1.8);
      hull(ctx, [[-34,-13],[-20,-8],[-11,13],[-27,10],[-38,15],[-27,-1]], '#7367a0', '#e1ceff', 0.8);
      hull(ctx, [[34,-13],[20,-8],[11,13],[27,10],[38,15],[27,-1]], '#7367a0', '#e1ceff', 0.8);
      hull(ctx, [[0,-42],[8,-21],[10,18],[0,27],[-10,18],[-8,-21]], s.base, s.shine, 1.5);
      hull(ctx, [[0,-27],[4,-15],[5,6],[0,11],[-5,6],[-4,-15]], '#b6c8ef', '#fff5ff', 0.8);
      [-30,30].forEach(px => core(ctx, px, 12, 2.2, '#d5a6ff', time));
      core(ctx, 0, 10, 3.8, s.accent, time);
    } else {
      [-23,-10,10,23].forEach(px => drawEngine(ctx, px, 22, time, '#ffc168', px === -10 || px === 10 ? 0.95 : 0.68));
      hull(ctx, [[-8,-28],[-21,-23],[-37,-1],[-40,24],[-26,30],[-14,23],[0,32],[14,23],[26,30],[40,24],[37,-1],[21,-23],[8,-28]], s.wing, s.rim, 2);
      hull(ctx, [[-38,0],[-28,-15],[-17,-14],[-20,8],[-32,20],[-39,20]], '#ada29b', '#ffe6b7', 1.2);
      hull(ctx, [[38,0],[28,-15],[17,-14],[20,8],[32,20],[39,20]], '#ada29b', '#ffe6b7', 1.2);
      hull(ctx, [[0,-36],[13,-21],[20,22],[11,31],[-11,31],[-20,22],[-13,-21]], s.base, s.shine, 2);
      hull(ctx, [[0,-29],[7,-15],[8,6],[0,12],[-8,6],[-7,-15]], '#ccc9c3', '#fff4e2', 0.9);
      line(ctx, [[-20,14],[-31,14],[-35,22]], '#ffe6b7', 1.2);
      line(ctx, [[20,14],[31,14],[35,22]], '#ffe6b7', 1.2);
      core(ctx, 0, 14, 6, s.accent, time);
      [-28,28].forEach(px => core(ctx, px, 6, 2.3, '#ffce7e', time));
    }
    ctx.restore();
  }

  function enemy(ctx, e, time = 0) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.hitFlash > 0;
    ctx.shadowBlur = flash ? 22 : 7;
    ctx.shadowColor = flash ? '#ffffff' : '#e46566';
    if (e.type === 'drone') {
      hull(ctx, [[0,21],[-8,5],[-23,-1],[-17,-18],[0,-11],[17,-18],[23,-1],[8,5]], '#3d3544', '#d88784', 1.6);
      hull(ctx, [[0,16],[-6,4],[0,-9],[6,4]], '#a95e64', '#ffd1bb', 0.8);
      [-17,17].forEach(px => core(ctx, px, -4, 2.2, '#ff865f', time));
      core(ctx, 0, 5, 3.5, '#ff675e', time);
    } else if (e.type === 'interceptor') {
      hull(ctx, [[0,29],[-11,14],[-31,9],[-23,-17],[-13,-24],[0,-15],[13,-24],[23,-17],[31,9],[11,14]], '#4b354b', '#e38eaf', 1.7);
      hull(ctx, [[-26,5],[-19,-14],[-12,5],[-19,13]], '#986a8d', '#ffd2e5', 0.8);
      hull(ctx, [[26,5],[19,-14],[12,5],[19,13]], '#986a8d', '#ffd2e5', 0.8);
      hull(ctx, [[0,22],[-6,4],[0,-12],[6,4]], '#a68aaa', '#ffe2ef');
      core(ctx, 0, 6, 4.5, '#ff6496', time);
    } else {
      hull(ctx, [[0,35],[-15,21],[-31,25],[-39,6],[-31,-28],[-14,-32],[0,-22],[14,-32],[31,-28],[39,6],[31,25],[15,21]], '#434357', '#b3a1e8', 2);
      hull(ctx, [[-34,5],[-27,-23],[-17,-13],[-18,20]], '#73718d', '#d5c8ff', 1);
      hull(ctx, [[34,5],[27,-23],[17,-13],[18,20]], '#73718d', '#d5c8ff', 1);
      hull(ctx, [[0,27],[-10,8],[-8,-18],[0,-25],[8,-18],[10,8]], '#9998b4', '#e4dfff', 1);
      [-25,0,25].forEach((px, i) => core(ctx, px, i ? 6 : 10, i ? 3 : 6, '#ae8eff', time));
    }
    if (flash) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius * 0.95, e.radius * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function boss(ctx, b, time = 0) {
    const leviathan = b.name === 'Void Leviathan';
    const s = leviathan ? 1.22 : 1;
    const accent = leviathan ? '#be89ff' : '#ff9e75';
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s, s);
    ctx.shadowColor = accent;
    ctx.shadowBlur = 13;
    // Outer structural pylons and independent turret mounts.
    hull(ctx, [[-15,-36],[-38,-41],[-69,-18],[-79,16],[-62,28],[-46,19],[-31,41],[-12,31]], leviathan ? '#44395e' : '#51404a', accent, 2.3);
    hull(ctx, [[15,-36],[38,-41],[69,-18],[79,16],[62,28],[46,19],[31,41],[12,31]], leviathan ? '#44395e' : '#51404a', accent, 2.3);
    for (const side of [-1, 1]) {
      const x = side * 58;
      hull(ctx, [[x-9,-12],[x+9,-12],[x+13,4],[x+6,17],[x-6,17],[x-13,4]], '#827080', '#ffc2a0');
      core(ctx, x, 6, 4.2, accent, time);
      line(ctx, [[side*34,-24],[side*53,-7],[side*51,12]], '#ffe4d5', 1.4);
    }
    // Central prow faces downward; front tip remains within the hit radius.
    hull(ctx, [[0,-48],[-26,-31],[-38,0],[-22,25],[0,57],[22,25],[38,0],[26,-31]], leviathan ? '#34344f' : '#393946', '#e4b9ac', 3);
    hull(ctx, [[0,-37],[-17,-23],[-22,5],[0,36],[22,5],[17,-23]], leviathan ? '#7678a6' : '#877b87', '#f5d5c0', 1.3);
    hull(ctx, [[0,50],[-8,32],[0,18],[8,32]], '#1a2238', '#fff0e1', 1);
    const exposed = b.coreOpen;
    ctx.save();
    ctx.rotate(time * (leviathan ? -0.8 : 0.65));
    ctx.strokeStyle = exposed ? '#fff2d7' : accent;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(0, 3, exposed ? 23 : 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    core(ctx, 0, 3, exposed ? 12 : 7, exposed ? '#ffd280' : accent, time);
    if (leviathan) {
      hull(ctx, [[-17,-29],[-32,-48],[-56,-51],[-38,-25]], '#655579', '#cdb0ff', 1.5);
      hull(ctx, [[17,-29],[32,-48],[56,-51],[38,-25]], '#655579', '#cdb0ff', 1.5);
      core(ctx, -31, -31, 2.5, '#ba9eff', time);
      core(ctx, 31, -31, 2.5, '#ba9eff', time);
    }
    if (b.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 40, 43, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (b.telegraph > 0) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.strokeStyle = `rgba(255,183,110,${0.32 + Math.sin(time * 16) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 14 + (1 - b.telegraph / 0.85) * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe0bc';
      ctx.fillText(b.pattern === 1 ? '锁定齐射 · LOCK ON' : '弹幕展开 · AREA ATTACK', 0, b.radius + 36);
      ctx.restore();
    }
  }

  function background(ctx, width, height, stars, hyper = false, time = 0) {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#080f23');
    bg.addColorStop(0.52, '#0b1527');
    bg.addColorStop(1, '#050a15');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    const glows = [[0.17, 0.22, '#25496a'], [0.85, 0.6, '#45304e']];
    for (const [x, y, color] of glows) {
      const r = Math.max(width, height) * 0.7;
      const grad = ctx.createRadialGradient(width*x, height*y, 1, width*x, height*y, r);
      grad.addColorStop(0, color + '75');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    // A distant atmospheric planet gives depth without obscuring gameplay.
    const px = width * 0.82, py = height * 0.28, pr = Math.min(width, height) * 0.22;
    const planet = ctx.createRadialGradient(px-pr*0.25, py-pr*0.35, pr*0.05, px, py, pr);
    planet.addColorStop(0, '#273d5c');
    planet.addColorStop(0.72, '#13283e');
    planet.addColorStop(1, '#0b1429');
    ctx.fillStyle = planet;
    ctx.beginPath();ctx.arc(px, py, pr, 0, Math.PI*2);ctx.fill();
    ctx.strokeStyle = 'rgba(126,183,209,0.24)';ctx.lineWidth = 1.5;
    ctx.beginPath();ctx.arc(px, py, pr, Math.PI*0.85, Math.PI*1.9);ctx.stroke();
    // Quiet navigation grid: only the stage is bright, never the background.
    ctx.strokeStyle = 'rgba(95,146,184,0.045)';ctx.lineWidth = 1;
    for (let x = (time * 9) % 66; x < width; x += 66) {
      ctx.beginPath();ctx.moveTo(x, 0);ctx.lineTo(x, height);ctx.stroke();
    }
    stars.forEach(star => {
      ctx.globalAlpha = star.alpha * 0.68;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, Math.max(0.9, star.size * 0.65), hyper ? star.size * 11 : star.size * 0.9);
    });
    ctx.globalAlpha = 1;
  }

  function bullet(ctx, b, enemyShot = false) {
    ctx.save();ctx.translate(b.x, b.y);
    ctx.shadowColor = b.color;ctx.shadowBlur = enemyShot ? 6 : 13;
    if (enemyShot) {
      const r = b.radius;
      ctx.fillStyle = b.color;
      ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle = 'rgba(255,245,238,0.85)';ctx.lineWidth = 1.3;
      ctx.beginPath();ctx.arc(0,0,r+1.7,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle = '#fff3ed';ctx.beginPath();ctx.arc(-r*0.16,-r*0.24,r*0.32,0,Math.PI*2);ctx.fill();
    } else if (b.homing) {
      const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.rotate(angle);
      hull(ctx,[[-4,7],[0,-9],[4,7],[0,3]],'#e8eef7',b.color,1.2);
      line(ctx, [[0,4],[0,13]], b.color, 2.7);
    } else {
      const glow = ctx.createLinearGradient(0,-b.height,0,b.height);
      glow.addColorStop(0,b.color+'00');glow.addColorStop(0.6,b.color);glow.addColorStop(1,'#ffffff');
      ctx.fillStyle = glow;
      ctx.beginPath();ctx.ellipse(0,0,Math.max(2,b.width/2),b.height,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f5ffff';ctx.fillRect(-1,-b.height/2,2,b.height);
    }
    ctx.restore();
  }

  window.ThunderVisuals = { fighter, enemy, boss, background, bullet };
})();
