/* PHANTOM signature weapon: 噬魂灵球 (Phantom Soul Orb).
 * Fires a piercing void orb that locks onto the first hit target for 3.0 seconds.
 * While locked, continuously deals decay damage to the target and emits a pulsating
 * aura ring that slows and damages nearby enemies. Scales with level and attackScale.
 */
(() => {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const MAX_ACTIVE_ORBS = 8;
  const TARGET_RANGE = 650;

  function createState() {
    const s = { orbs: [], fireElapsed: 0, serial: 0 };
    Object.defineProperty(s, 'scythes', {
      get: () => s.orbs,
      set: (v) => { s.orbs = v; },
      enumerable: true
    });
    return s;
  }

  function state(pilot) {
    if (!pilot || pilot.shipId !== 'phantom') return null;
    return pilot.phantomScythe ||= createState();
  }

  function closestEnemies(enemies, origin, count = 1) {
    const valid = [];
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - origin.x, dy = e.y - origin.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= TARGET_RANGE * TARGET_RANGE) {
        valid.push({ enemy: e, distSq: d2 });
      }
    }
    valid.sort((a, b) => a.distSq - b.distSq);
    return valid.slice(0, count).map(v => v.enemy);
  }

  function segmentDistanceSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    const nx = x1 + t * dx, ny = y1 + t * dy;
    return (px - nx) * (px - nx) + (py - ny) * (py - ny);
  }

  function spawnOrb(pilot, target, level) {
    const s = state(pilot);
    if (!s || s.orbs.length >= MAX_ACTIVE_ORBS) return null;

    let angle = Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : (pilot.angle || 0);
    if (target && !target.dead && target.hp > 0) {
      angle = Math.atan2(target.y - pilot.y, target.x - pilot.x);
    }

    const baseDamage = 20 + (level - 1) * 6.5;
    const auraRadius = 105 + level * 18; // 123px at Lv1 up to 195px at Lv5
    const orb = {
      id: ++s.serial,
      x: pilot.x,
      y: pilot.y,
      vx: Math.cos(angle) * 420,
      vy: Math.sin(angle) * 420,
      angle,
      speed: 420,
      rangeRemaining: 600,
      phase: 'flight', // 'flight' -> 'locked'
      target: null,
      lockRemaining: 3.0, // Exactly 3.0 seconds lock duration
      lockDuration: 3.0,
      tickTimer: 0,       // Damage tick to locked target every 0.25s
      auraPulseTimer: 0,  // AoE pulse to nearby enemies every 0.35s
      damage: baseDamage,
      auraRadius,
      level
    };
    s.orbs.push(orb);
    return orb;
  }

  function dealOrbDamage(game, pilot, enemy, damage, source, applySlow = false) {
    if (!enemy || enemy.dead || enemy.hp <= 0) return;
    const hpPercent = enemy.hp / Math.max(enemy.maxHp || enemy.hp, 1);
    const marked = window.NeonPhantom?.isMarked ? window.NeonPhantom.isMarked(pilot, enemy, game.survivalTime || 0) : false;
    const executeLvl = pilot.passives?.execute_master || 0;
    const executeBonus = executeLvl * ((hpPercent < 0.35 || marked) ? 0.15 : 0);
    const isCrit = (pilot.phantom && window.NeonPhantom) ?
      (Math.random() < window.NeonPhantom.critBonus(pilot, game.survivalTime || 0)) : false;
    const scale = window.NeonPhantom?.attackScale?.(pilot) || (pilot.dmgMultiplier || 1);
    game.dealDamage(enemy, damage * (1 + executeBonus) * scale, source, isCrit, pilot);

    if (applySlow) {
      enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 0.55);
    }

    const gatherLvl = pilot.passives?.soul_gatherer || 0;
    if (gatherLvl > 0 && marked) {
      // Recharge-only refund: addStealthEnergy rejects it while the ghost form
      // is running, otherwise hovering on a permanently marked boss refunds
      // far more than the 1/s drain and stealth never ends.
      window.NeonPhantom?.addStealthEnergy?.(pilot, 0.08 * gatherLvl);
    }
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
    const interval = Math.max(0.70, (1.9 - (level - 1) * 0.22) * (pilot.cdrMultiplier || 1));

    s.fireElapsed += dt;
    if (s.fireElapsed >= interval) {
      s.fireElapsed = Math.min(s.fireElapsed - interval, interval);

      // Level 1-2: 1 orb; Level 3-4: 2 orbs; Level 5: 3 orbs
      const count = level >= 5 ? 3 : (level >= 3 ? 2 : 1);
      const targets = closestEnemies(enemies, pilot, count);

      for (let i = 0; i < count; i++) {
        const assignedTarget = targets[i] || targets[0] || null;
        spawnOrb(pilot, assignedTarget, level);
      }
    }

    const now = game.survivalTime || 0;

    // Update active orbs
    for (let i = s.orbs.length - 1; i >= 0; i--) {
      const orb = s.orbs[i];

      if (orb.phase === 'flight') {
        const prevX = orb.x, prevY = orb.y;
        const step = orb.speed * dt;
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.rangeRemaining -= step;

        // Continuous collision check with first target
        let hitEnemy = null;
        for (const e of enemies) {
          if (!e || e.dead || e.hp <= 0) continue;
          const r = (e.radius || 14) + 16;
          if (segmentDistanceSq(e.x, e.y, prevX, prevY, orb.x, orb.y) <= r * r) {
            hitEnemy = e;
            break;
          }
        }

        if (hitEnemy) {
          // Latch on and lock target for 3.0 seconds!
          orb.phase = 'locked';
          orb.target = hitEnemy;
          orb.x = hitEnemy.x;
          orb.y = hitEnemy.y;
          orb.lockRemaining = 3.0;

          // Impact hit
          dealOrbDamage(game, pilot, hitEnemy, orb.damage, 'phantom_orb_impact');
          if (window.NeonPhantom?.markEnemy) {
            window.NeonPhantom.markEnemy(pilot, hitEnemy, now);
          }
          window.NeonPhantomVisual?.emit(pilot, 'burst', hitEnemy, null, orb.auraRadius * 0.7, 0.3);
        } else if (orb.rangeRemaining <= 0) {
          s.orbs.splice(i, 1);
        }
      } else if (orb.phase === 'locked') {
        // Track target coordinates
        if (orb.target && !orb.target.dead && orb.target.hp > 0) {
          orb.x = orb.target.x;
          orb.y = orb.target.y;
        }

        orb.lockRemaining -= dt;

        // 1. Continuous decay damage to the locked target every 0.25s
        orb.tickTimer += dt;
        if (orb.tickTimer >= 0.25) {
          orb.tickTimer -= 0.25;
          if (orb.target && !orb.target.dead && orb.target.hp > 0) {
            dealOrbDamage(game, pilot, orb.target, orb.damage * 0.45, 'phantom_orb_decay');
          }
        }

        // 2. Pulsating light ring: slows and damages nearby monsters every 0.35s
        orb.auraPulseTimer += dt;
        if (orb.auraPulseTimer >= 0.35) {
          orb.auraPulseTimer -= 0.35;
          const aoeDamage = orb.damage * 0.36;
          const rSq = orb.auraRadius * orb.auraRadius;
          let aoeHits = 0;

          for (const e of enemies) {
            if (!e || e.dead || e.hp <= 0 || e === orb.target) continue;
            const dx = e.x - orb.x, dy = e.y - orb.y;
            if (dx * dx + dy * dy <= rSq) {
              dealOrbDamage(game, pilot, e, aoeDamage, 'phantom_orb_aura', true);
              if (++aoeHits >= 16) break;
            }
          }
        }

        // Expiration after 3.0 seconds
        if (orb.lockRemaining <= 0) {
          if (orb.level >= 5) {
            // Level 5 final void detonation
            const burstDamage = orb.damage * 2.2;
            const rSq = orb.auraRadius * orb.auraRadius;
            for (const e of enemies) {
              if (!e || e.dead || e.hp <= 0) continue;
              const dx = e.x - orb.x, dy = e.y - orb.y;
              if (dx * dx + dy * dy <= rSq) {
                dealOrbDamage(game, pilot, e, burstDamage, 'phantom_orb_detonate', true);
              }
            }
            if ((game.shockwaves?.length || 0) < 40) {
              game.shockwaves.push({
                x: orb.x, y: orb.y, radius: 15, maxRadius: orb.auraRadius,
                color: '#a855f7', alpha: 0.9
              });
            }
          }
          s.orbs.splice(i, 1);
        }
      }
    }
  }

  function render(ctx, pilot) {
    const s = pilot?.phantomScythe;
    if (!s?.orbs?.length || !ctx) return;
    ctx.save();
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    for (const orb of s.orbs) {
      const isLocked = orb.phase === 'locked';

      if (isLocked) {
        // --- 1. Pulsating Light Ring (Aura) around locked target ---
        const pulse = (timeSec * 2.2) % 1;
        const radius = orb.auraRadius;
        const currentR = radius * (0.88 + 0.12 * Math.sin(timeSec * 6));

        // Soft outer glowing ring (no shadowBlur)
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner sharp neon violet ring
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentR, 0, Math.PI * 2);
        ctx.stroke();

        // Expanding secondary shock pulse
        const expandR = radius * pulse;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - pulse})`;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, expandR, 0, Math.PI * 2);
        ctx.stroke();

        // Light background fill
        ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentR, 0, Math.PI * 2);
        ctx.fill();

        // --- 2. Central Locked Energy Singularity Core ---
        ctx.save();
        ctx.translate(orb.x, orb.y);

        // Rotating lock runes
        const rot = timeSec * 4;
        ctx.rotate(rot);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-9, -9, 18, 18);

        // Core cyan/magenta diamond
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // --- Flying Projectile Orb ---
        ctx.save();
        ctx.translate(orb.x, orb.y);
        ctx.rotate(orb.angle);

        // Outer soft cyan aura
        ctx.fillStyle = 'rgba(0, 240, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // High-energy white nucleus
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(1.5, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();

        // High-velocity trailing tail
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-24, 0);
        ctx.stroke();

        ctx.restore();
      }
    }
    ctx.restore();
  }

  // Alias compatible API
  window.NeonPhantomScythe = Object.freeze({
    state, spawnScythe: spawnOrb, spawnOrb, tick, render, MAX_ACTIVE_ORBS, MAX_ACTIVE_SCYTHES: MAX_ACTIVE_ORBS
  });
})();
