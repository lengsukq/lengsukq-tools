/* ASTRA signature weapon: anchored spell links, independent of old drones.
 * The host alone calls tick(). Client rendering consumes bounded anchor state.
 * This module is safe to load while ASTRA is locked for live selection.
 */
(() => {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const MAX_TARGETS = 8;
  const FIRE_RANGE = 650;
  const LINK_INTERVAL = .5;
  const BURST_COOLDOWN = 6;
  const MAX_MISSILES = 24;

  function createState() {
    return { anchors: [], missiles: [], fireElapsed: 0, linkElapsed: 0,
      nextBurstAt: 0, serial: 0 };
  }
  function state(pilot) {
    if (!pilot || pilot.shipId !== 'astra') return null;
    return pilot.starWeave ||= createState();
  }
  function closest(enemies, pilot) {
    let best = null;
    let bestSquare = FIRE_RANGE * FIRE_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestSquare) { best = e; bestSquare = d2; }
    }
    return best;
  }
  function findTargets(enemies, pilot, count = 1) {
    const list = [];
    const maxSq = FIRE_RANGE * FIRE_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= maxSq) list.push({ e, d2 });
    }
    list.sort((a, b) => a.d2 - b.d2);
    return list.slice(0, count).map(item => item.e);
  }
  function segmentDistanceSq(x, y, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq < 1) return Infinity;
    const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1);
    const ex = x - a.x - t * dx, ey = y - a.y - t * dy;
    return ex * ex + ey * ey;
  }
  function linkedPairs(anchors) {
    const pairs = [];
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        pairs.push([anchors[i], anchors[j]]);
        if (pairs.length >= 3) return pairs;
      }
    }
    return pairs;
  }
  function applyDamage(game, pilot, enemy, amount, source, energy = false) {
    game.dealDamage(enemy, amount * (pilot.dmgMultiplier || 1), source, false, pilot);
    if (energy) window.NeonAstra?.regenOnHit(pilot, enemy, game.survivalTime || 0);
  }
  function tick(pilot, game, dt) {
    const level = clamp(Math.floor(pilot?.weapons?.star_weave || 0), 0, 5);
    if (pilot?.shipId !== 'astra' || level < 1 || pilot.hp <= 0 ||
        pilot.downed || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return;
    const s = state(pilot);
    const enemies = game.enemies || [];
    for (let i = s.anchors.length - 1; i >= 0; i--) {
      s.anchors[i].life -= dt;
      if (s.anchors[i].life <= 0) s.anchors.splice(i, 1);
    }
    const interval = Math.max(.28, (level >= 2 ? .52 : .65) *
      (pilot.cdrMultiplier || 1));
    s.fireElapsed += dt;
    if (s.fireElapsed >= interval) {
      s.fireElapsed = Math.min(s.fireElapsed - interval, interval);
      // Homing projectiles count scales with level:
      // Lv1: 1 homing missile (single target tracking)
      // Lv2: 2 homing missiles (can track 2 distinct targets)
      // Lv3: 3 homing missiles (multi-target swarm)
      // Lv4: 4 homing missiles (high barrage density)
      // Lv5: 5 homing missiles (barrage cluster swarm)
      const missileCount = Math.min(5, Math.max(1, level));
      const targets = findTargets(enemies, pilot, missileCount);
      if (targets.length > 0) {
        s.missiles ||= [];
        const baseAngle = Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : 0;
        for (let i = 0; i < missileCount; i++) {
          if (s.missiles.length >= MAX_MISSILES) s.missiles.shift();
          const target = targets[i % targets.length];
          const spread = missileCount > 1 ? (i - (missileCount - 1) / 2) * 0.35 : 0;
          const launchAngle = baseAngle + spread;
          const launchSpeed = 480;
          s.missiles.push({
            x: pilot.x,
            y: pilot.y,
            vx: Math.cos(launchAngle) * launchSpeed,
            vy: Math.sin(launchAngle) * launchSpeed,
            target,
            damage: 28,
            life: 2.2,
            deployAnchor: i === 0 || i >= missileCount - 1,
            trail: [{ x: pilot.x, y: pilot.y }]
          });
        }
      }
    }

    // Update active homing missiles with sub-stepping for smooth physics & collision accuracy
    if (s.missiles?.length) {
      let remainingDt = dt;
      const step = Math.min(0.032, dt);
      while (remainingDt > 0) {
        const subDt = Math.min(step, remainingDt);
        remainingDt -= subDt;

        for (let i = s.missiles.length - 1; i >= 0; i--) {
          const m = s.missiles[i];
          m.life -= subDt;
          if (m.life <= 0) {
            s.missiles.splice(i, 1);
            continue;
          }

          // Target retargeting if current target died
          if (!m.target || m.target.dead || m.target.hp <= 0) {
            m.target = closest(enemies, m);
          }

          if (m.target && !m.target.dead && m.target.hp > 0) {
            const dx = m.target.x - m.x;
            const dy = m.target.y - m.y;
            const dist = Math.hypot(dx, dy);
            const speed = Math.hypot(m.vx, m.vy);
            const hitR = (m.target.radius || 12) + 16;

            if (dist <= hitR || dist <= speed * subDt) {
              // Impact hit
              applyDamage(game, pilot, m.target, m.damage, 'astra_weave_bolt', true);
              if ((pilot.passives?.star_mark_hunt || 0) > 0) {
                window.NeonAstraArsenal?.markEnemy(pilot, m.target, (game.survivalTime || 0) + 3);
              }

              // Deploy anchor on impact point
              if (m.deployAnchor) {
                const angle = s.serial++ * 2.3999632;
                const newAnchor = {
                  x: m.target.x + Math.cos(angle) * 25,
                  y: m.target.y + Math.sin(angle) * 25,
                  life: level >= 4 ? 5 : 4
                };
                const maxAnchors = level >= 3 ? 3 : 2;
                if (s.anchors.length >= maxAnchors) s.anchors.shift();
                s.anchors.push(newAnchor);
              }

              s.missiles.splice(i, 1);
              continue;
            }

            // Homing curve towards target
            const maxSpeed = 740;
            const targetVx = (dx / dist) * maxSpeed;
            const targetVy = (dy / dist) * maxSpeed;
            const steer = Math.min(1, 15 * subDt);
            m.vx += (targetVx - m.vx) * steer;
            m.vy += (targetVy - m.vy) * steer;
          }

          m.x += m.vx * subDt;
          m.y += m.vy * subDt;

          m.trail ||= [];
          m.trail.unshift({ x: m.x, y: m.y });
          if (m.trail.length > 7) m.trail.pop();
        }
      }
    }
    s.linkElapsed += dt;
    if (s.linkElapsed >= LINK_INTERVAL) {
      s.linkElapsed %= LINK_INTERVAL;
      const pairs = linkedPairs(s.anchors);
      const width = level >= 4 ? 16 : 11;
      const damage = 8 * (level >= 2 ? 1.25 : 1);
      let count = 0;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.hp <= 0) continue;
        const range = width + (enemy.radius || 12);
        if (!pairs.some(([a, b]) => segmentDistanceSq(enemy.x, enemy.y, a, b) <= range * range)) {
          continue;
        }
        applyDamage(game, pilot, enemy, damage, 'astra_weave_link', true);
        if (++count >= MAX_TARGETS) break;
      }
    }
    // A complete 3-node network triggers a bounded blast no more than once
    // every 6 seconds. Burst damage cannot grant mana or trigger itself.
    const now = game.survivalTime || 0;
    if (level >= 5 && s.anchors.length === 3 && now >= s.nextBurstAt) {
      s.nextBurstAt = now + BURST_COOLDOWN;
      const center = s.anchors.reduce((p, a) =>
        ({ x: p.x + a.x / 3, y: p.y + a.y / 3 }), { x: 0, y: 0 });
      let count = 0;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.hp <= 0 ||
            Math.hypot(enemy.x - center.x, enemy.y - center.y) > 108 + (enemy.radius || 12)) continue;
        applyDamage(game, pilot, enemy, 110, 'astra_weave_burst', false);
        if (++count >= 12) break;
      }
      if ((game.shockwaves?.length || 0) < 35) game.shockwaves?.push({
        x: center.x, y: center.y, radius: 16, maxRadius: 108,
        color: '#c18cff', alpha: .85
      });
    }
  }
  function render(ctx, pilot) {
    const s = pilot?.starWeave;
    if (!s?.anchors?.length || !ctx) return;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;
    const pairs = linkedPairs(s.anchors);

    ctx.save();

    // 1. Constellation Enclosed Nebula Field (when 3 nodes form a celestial triangle)
    if (s.anchors.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(s.anchors[0].x, s.anchors[0].y);
      ctx.lineTo(s.anchors[1].x, s.anchors[1].y);
      ctx.lineTo(s.anchors[2].x, s.anchors[2].y);
      ctx.closePath();
      const triAlpha = 0.08 + Math.sin(timeSec * 4) * 0.04;
      ctx.fillStyle = `rgba(168, 85, 247, ${triAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(192, 132, 252, ${triAlpha * 2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Multi-tier Celestial Resonance Beams
    for (const [a, b] of pairs) {
      // Outer ethereal glow
      ctx.strokeStyle = 'rgba(167, 120, 255, 0.4)';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Core concentrated starlight laser beam
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Travelling starlight energy packets along the beam
      const travel = (timeSec * 1.5) % 1;
      const px = a.x + (b.x - a.x) * travel;
      const py = a.y + (b.y - a.y) * travel;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Four-point Celestial Star Crystal Anchor Nodes
    for (const anchor of s.anchors) {
      ctx.save();
      ctx.translate(anchor.x, anchor.y);
      const nodePulse = Math.sin(timeSec * 6 + anchor.x) * 1.5;
      const rot = timeSec * 1.8;

      // Pulsing aura ring
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#c084fc';
      ctx.beginPath();
      ctx.arc(0, 0, 9 + nodePulse, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating four-pointed starlight crystal
      ctx.rotate(rot);
      ctx.fillStyle = '#f3e8ff';
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#d8b4fe';
      ctx.beginPath();
      ctx.moveTo(0, -7.5);
      ctx.lineTo(2.2, -2.2);
      ctx.lineTo(7.5, 0);
      ctx.lineTo(2.2, 2.2);
      ctx.lineTo(0, 7.5);
      ctx.lineTo(-2.2, 2.2);
      ctx.lineTo(-7.5, 0);
      ctx.lineTo(-2.2, -2.2);
      ctx.closePath();
      ctx.fill();

      // Brilliant core center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 4. Homing Starlight Needles / Missiles (Astral Tracking Darts)
    if (s.missiles?.length) {
      for (const m of s.missiles) {
        ctx.save();

        // Starlight trail ribbon
        if (m.trail?.length > 1) {
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
          ctx.lineWidth = 3.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#c084fc';
          ctx.beginPath();
          ctx.moveTo(m.trail[0].x, m.trail[0].y);
          for (let i = 1; i < m.trail.length; i++) {
            ctx.lineTo(m.trail[i].x, m.trail[i].y);
          }
          ctx.stroke();

          // Inner white starlight filament
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(m.trail[0].x, m.trail[0].y);
          for (let i = 1; i < m.trail.length; i++) {
            ctx.lineTo(m.trail[i].x, m.trail[i].y);
          }
          ctx.stroke();
        }

        // Missile arrowhead
        ctx.translate(m.x, m.y);
        const heading = Math.atan2(m.vy, m.vx);
        ctx.rotate(heading);

        // Radiant core glow
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#c084fc';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Astral needle point
        ctx.fillStyle = '#f3e8ff';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-4, -2.8);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 2.8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.restore();
  }
  window.NeonAstraWeave = Object.freeze({
    MAX_TARGETS, LINK_INTERVAL, BURST_COOLDOWN,
    createState, state, closest, segmentDistanceSq, linkedPairs, tick, render
  });
})();
