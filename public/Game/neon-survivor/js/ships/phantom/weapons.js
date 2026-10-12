/* PHANTOM signature weapon: 幽魂之镰 (Phantom Scythe).
 * Dual-phase boomerang projectile: outward slicing, peak hover spin, and curved return.
 * Reabsorbing a returned scythe recovers ectoplasm and triggers Lv5 harvest pulses.
 */
(() => {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const MAX_ACTIVE_SCYTHES = 6;
  const TARGET_RANGE = 600;

  function createState() {
    return { scythes: [], fireElapsed: 0, serial: 0 };
  }

  function state(pilot) {
    if (!pilot || pilot.shipId !== 'phantom') return null;
    return pilot.phantomScythe ||= createState();
  }

  function closestEnemy(enemies, origin) {
    let best = null;
    let bestDistSq = TARGET_RANGE * TARGET_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - origin.x, dy = e.y - origin.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) { best = e; bestDistSq = d2; }
    }
    return best;
  }

  function spawnScythe(pilot, angle, level) {
    const s = state(pilot);
    if (!s || s.scythes.length >= MAX_ACTIVE_SCYTHES) return null;

    const baseDist = level >= 2 ? 290 : 230;
    const damage = 18 + (level - 1) * 5;
    const scythe = {
      x: pilot.x,
      y: pilot.y,
      originX: pilot.x,
      originY: pilot.y,
      angle,
      targetX: pilot.x + Math.cos(angle) * baseDist,
      targetY: pilot.y + Math.sin(angle) * baseDist,
      phase: 'out', // 'out' -> 'hover' -> 'return'
      speed: 380,
      hoverTime: 0.38,
      damage,
      hitHistory: new Set(),
      hoverDamageElapsed: 0,
      level
    };
    s.scythes.push(scythe);
    return scythe;
  }

  function segmentDistanceSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    const nx = x1 + t * dx, ny = y1 + t * dy;
    return (px - nx) * (px - nx) + (py - ny) * (py - ny);
  }

  function dealScytheDamage(game, pilot, enemy, damage, source) {
    if (!enemy || enemy.dead || enemy.hp <= 0) return;
    const isCrit = (pilot.phantom && window.NeonPhantom) ?
      (Math.random() < window.NeonPhantom.critBonus(pilot, game.survivalTime || 0)) : false;
    game.dealDamage(enemy, damage * (pilot.dmgMultiplier || 1), source, isCrit, pilot);
    if (window.NeonPhantom) {
      window.NeonPhantom.addEctoplasm(pilot, 2);
    }
  }

  function tick(pilot, game, dt) {
    const level = clamp(Math.floor(pilot?.weapons?.phantom_scythe || 0), 0, 5);
    if (pilot?.shipId !== 'phantom' || level < 1 || pilot.hp <= 0 ||
        pilot.downed || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return;

    const s = state(pilot);
    const enemies = game.enemies || [];
    const interval = Math.max(0.65, (1.8 - (level - 1) * 0.24) * (pilot.cdrMultiplier || 1));

    s.fireElapsed += dt;
    if (s.fireElapsed >= interval) {
      s.fireElapsed = Math.min(s.fireElapsed - interval, interval);
      const target = closestEnemy(enemies, pilot);
      const baseAngle = target ? Math.atan2(target.y - pilot.y, target.x - pilot.x) :
        (pilot.angle || 0);

      const count = level >= 3 ? 3 : 2;
      const spread = 0.35;
      const startAngle = baseAngle - ((count - 1) * spread) / 2;

      for (let i = 0; i < count; i++) {
        spawnScythe(pilot, startAngle + i * spread, level);
      }
    }

    // Update active flying scythes
    for (let i = s.scythes.length - 1; i >= 0; i--) {
      const sc = s.scythes[i];
      const prevX = sc.x;
      const prevY = sc.y;

      if (sc.phase === 'out') {
        const dx = sc.targetX - sc.x;
        const dy = sc.targetY - sc.y;
        const dist = Math.hypot(dx, dy);
        const step = sc.speed * dt;
        if (dist <= step) {
          sc.x = sc.targetX;
          sc.y = sc.targetY;
          sc.phase = 'hover';
          sc.hitHistory.clear(); // Reset for hover ticks
        } else {
          sc.x += (dx / dist) * step;
          sc.y += (dy / dist) * step;
        }

        // Damage enemies on outward flight with continuous collision
        for (const e of enemies) {
          if (!e || e.dead || e.hp <= 0 || sc.hitHistory.has(e)) continue;
          if (segmentDistanceSq(e.x, e.y, prevX, prevY, sc.x, sc.y) <= 36 * 36) {
            sc.hitHistory.add(e);
            dealScytheDamage(game, pilot, e, sc.damage, 'phantom_scythe_out');
          }
        }
      } else if (sc.phase === 'hover') {
        sc.hoverTime -= dt;
        sc.hoverDamageElapsed += dt;
        if (sc.hoverDamageElapsed >= 0.18) {
          sc.hoverDamageElapsed = 0;
          for (const e of enemies) {
            if (!e || e.dead || e.hp <= 0) continue;
            if (Math.hypot(e.x - sc.x, e.y - sc.y) <= 38) {
              const hoverBonus = level >= 2 ? 1.3 : 1.0;
              dealScytheDamage(game, pilot, e, sc.damage * 0.65 * hoverBonus, 'phantom_scythe_hover');
            }
          }
        }
        if (sc.hoverTime <= 0) {
          sc.phase = 'return';
          sc.hitHistory.clear(); // Reset for return flight
        }
      } else if (sc.phase === 'return') {
        const dx = pilot.x - sc.x;
        const dy = pilot.y - sc.y;
        const dist = Math.hypot(dx, dy);
        const returnSpeed = sc.speed * 1.25;
        const step = returnSpeed * dt;
        if (dist <= step || dist < 22) {
          // Reabsorbed by pilot!
          s.scythes.splice(i, 1);
          if (window.NeonPhantom) {
            window.NeonPhantom.addEctoplasm(pilot, 4);
          }

          // Lv5 Harvest Burst when reabsorbed
          if (sc.level >= 5) {
            for (const e of enemies) {
              if (!e || e.dead || e.hp <= 0) continue;
              if (Math.hypot(e.x - pilot.x, e.y - pilot.y) <= 120) {
                dealScytheDamage(game, pilot, e, 45, 'phantom_scythe_burst');
              }
            }
            if ((game.shockwaves?.length || 0) < 40) {
              game.shockwaves?.push({
                x: pilot.x, y: pilot.y, radius: 10, maxRadius: 120,
                color: '#00f0ff', alpha: 0.8
              });
            }
          }
          continue;
        } else {
          sc.x += (dx / dist) * step;
          sc.y += (dy / dist) * step;
        }

        // Damage enemies on return flight with continuous collision
        for (const e of enemies) {
          if (!e || e.dead || e.hp <= 0 || sc.hitHistory.has(e)) continue;
          if (segmentDistanceSq(e.x, e.y, prevX, prevY, sc.x, sc.y) <= 36 * 36) {
            sc.hitHistory.add(e);
            dealScytheDamage(game, pilot, e, sc.damage * 1.15, 'phantom_scythe_return');
          }
        }
      }
    }
  }

  function render(ctx, pilot) {
    const s = pilot?.phantomScythe;
    if (!s?.scythes?.length || !ctx) return;
    ctx.save();
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    for (const sc of s.scythes) {
      ctx.save();
      ctx.translate(sc.x, sc.y);
      const spin = (sc.phase === 'hover') ? (now * 0.02) : (sc.angle + now * 0.012);

      // 1. Ghostly Motion-Blur Slashing Arc Trails
      const isHover = sc.phase === 'hover';
      const trailAlpha = isHover ? 0.35 : 0.55;
      ctx.save();
      ctx.rotate(spin - 0.25);
      ctx.strokeStyle = `rgba(0, 240, 255, ${trailAlpha * 0.5})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 18, Math.PI, Math.PI * 1.7);
      ctx.stroke();
      ctx.restore();

      ctx.rotate(spin);

      // 2. Twin Spectral Crescent Scythe Blades
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.4;
      ctx.fillStyle = '#120724';

      // Blade 1
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 0.88);
      ctx.lineTo(3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade 1 inner soul rune spine
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0.15, Math.PI * 0.75);
      ctx.stroke();

      // Blade 2
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 17, Math.PI, Math.PI * 1.88);
      ctx.lineTo(-3, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade 2 inner soul rune spine
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, Math.PI + 0.15, Math.PI * 1.75);
      ctx.stroke();

      // 3. Central Ocular Void Core
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#a855f7';
      ctx.fill();

      // Slit pupil in center of scythe
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Hover Resonance Pulse Rings
      if (isHover) {
        const pulse = (now * 0.006) % 1;
        ctx.beginPath();
        ctx.arc(0, 0, 15 + pulse * 24, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - pulse})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 8 + pulse * 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.8 * (1 - pulse)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  window.NeonPhantomScythe = Object.freeze({
    state, spawnScythe, tick, render, MAX_ACTIVE_SCYTHES
  });
})();
