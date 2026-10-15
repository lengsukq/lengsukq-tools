/* Co-op-only bosses: the host simulates them, the guest paints the same state.
 *
 * WHY A REGISTRY
 * Every co-op boss is a coordination test a solo pilot cannot pass alone: two
 * capture points, two opposite flanks, two polarities. They share a lifecycle
 * (create -> update -> damage -> render -> reward) and they share one hard
 * problem: the guest has to paint exactly what the host simulated, from nothing
 * but the replicated enemy fields. A registry keeps that contract in one place
 * instead of scattering `type === 'boss_x'` checks across the simulation, the
 * damage path, the reward path and two render paths.
 *
 * THE WIRE BUDGET IS THE DESIGN CONSTRAINT
 * The enemy layer carries 16 fields and no more (schema.js), and the frame
 * budget is measured to the byte, so a boss may only keep state in channels that
 * ALREADY travel:
 *
 *   coopCapture   float   progress towards breaking the shield (0..holdSeconds)
 *   coopExposed   float   seconds of vulnerability left (0 = shielded)
 *   arming        bool    shield up (false while the core is exposed)
 *   aimTimer      float   free float; used here as the anchor orbit angle
 *
 * Everything else a boss needs is DERIVED from replicated data on both ends:
 * positions, velocities and the party. The mirror bastion computes its flank
 * split from the boss velocity plus pilot positions rather than shipping a
 * "left is held" bit, because a derived value cannot drift from the state it was
 * derived from, and two ends that derive the same thing cannot disagree.
 *
 * FAIL-OPEN RULE
 * A guest that disconnects must never leave an unkillable boss behind. A boss is
 * only shielded while the encounter is ACTIVE: modifyBossDamage in encounters.js
 * returns the raw damage the moment the room stops hosting, so whoever is left
 * can always finish the fight.
 */
(() => {
  'use strict';
  const TUNING = Object.freeze({
    // Shared: enemy bullets are the one layer a guest cannot play without.
    maxEnemyBullets: 130,

    // --- 双生裁决者 · 共振要塞 (dual reactor) ---
    captureRadius: 88, captureSeconds: 1.4, vulnerableSeconds: 9,
    shieldedDamage: 0.45, exposedDamage: 1.25,
    dualVolleyInterval: 3.6, dualVolleyWarning: 0.7,

    // --- 镜像壁垒 · 逆相护罩 (mirror bastion) ---
    // Damage is nearly nil unless the party holds BOTH flanks at once; holding
    // both for flankHoldSeconds tears the shield open for flankExposeSeconds.
    flankRange: 620, flankHoldSeconds: 1.2, flankExposeSeconds: 9,
    flankShielded: 0.15, flankExposed: 1.25, flankVolleyInterval: 3.2,

    // --- 极性分裂 · 电荷枷锁 (polarity split) ---
    // A rotating anchor zone only charges while one + and one - stand inside it.
    anchorOrbit: 150, anchorRadius: 130, anchorSpin: 0.6,
    polarityHoldSeconds: 1.4, polarityExposeSeconds: 8,
    polarityShielded: 0.35, polarityExposed: 1.3, polarityVolleyInterval: 2.8
  });

  const SEAT_ORDER = Object.freeze(['host', 'guest', 'guest-2', 'guest-3']);
  const TAU = Math.PI * 2;

  // --- party helpers ---------------------------------------------------------
  // `visibleTeam` is the ONE way a boss reads the party, and it works from both
  // sides of the wire: the host reads its live world, a guest reads the
  // replicated snapshot. That is what lets ONE render function serve both ends,
  // instead of host logic plus a guest-only special case that drifts from it.
  //
  // Seat ids ('host', 'guest', 'guest-2', 'guest-3') travel in `players[]`, so
  // polarity and pairing are stable no matter who joined when.

  /** `[{id, pilot}]` in seat order, living only. `allies` holds guests only. */
  function hostTeam(game) {
    const allies = game?.lanCoop?.allies;
    const list = allies && allies.size
      ? [...allies.entries()].map(([id, pilot]) => ({ id, pilot }))
      : (game?.lanCoop?.ally ? [{ id: 'guest', pilot: game.lanCoop.ally }] : []);
    return [{ id: 'host', pilot: game?.player }, ...list]
      .filter(entry => entry.pilot && entry.pilot.hp > 0 &&
        !entry.pilot.downed && !entry.pilot.disconnected);
  }

  /** The same list on a guest, read from the frame it was sent. */
  function guestTeam(game) {
    const state = game?.lanCoop?.currentRenderState;
    const list = state?.players;
    const entries = Array.isArray(list) && list.length
      ? list.map(p => ({ id: p.id, pilot: p }))
      : [
          state?.host && { id: 'host', pilot: state.host },
          state?.guest && { id: state.localPlayerId || 'guest', pilot: state.guest }
        ].filter(Boolean);
    return entries.filter(({ pilot }) => pilot && !pilot.downed &&
      (pilot.hp === undefined || pilot.hp > 0));
  }

  function visibleTeam(game) {
    return game?.isGuestWorldView ? guestTeam(game) : hostTeam(game);
  }

  function livingPilots(game) {
    return visibleTeam(game).map(entry => entry.pilot);
  }

  function nearestPilot(game, boss) {
    let best = null, bestDist = Infinity;
    for (const pilot of livingPilots(game)) {
      const dist = Math.hypot(pilot.x - boss.x, pilot.y - boss.y);
      if (dist < bestDist) { bestDist = dist; best = pilot; }
    }
    return best;
  }

  /** +1 / -1 by SEAT, never by join order: both ends must agree. */
  function polarityOfSeat(id) {
    const index = SEAT_ORDER.indexOf(id);
    return (index < 0 ? 0 : index) % 2 === 0 ? 1 : -1;
  }

  /** Aimed volleys: one spread per living pilot, capped by the bullet budget. */
  function volley(game, boss, color, damage, spread, speed = 245, life = 3.3) {
    if ((game.enemyBullets?.length || 0) >= TUNING.maxEnemyBullets - 8) return;
    for (const player of livingPilots(game).slice(0, 4)) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * spread;
        game.enemyBullets.push({
          x: boss.x, y: boss.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          radius: 5, color, damage, life
        });
      }
    }
  }

  function announce(game, boss, text, color, size = 18, life = 1.5) {
    if (!Array.isArray(game.texts) || game.texts.length >= 35) return;
    game.texts.push({ x: boss.x, y: boss.y - 80, text, color, size, life, maxLife: life });
  }

  function burst(game, boss, color, maxRadius = 280) {
    if (!Array.isArray(game.shockwaves) || game.shockwaves.length >= 40) return;
    game.shockwaves.push({ x: boss.x, y: boss.y, radius: 15, maxRadius, alpha: 1, color });
  }

  function healTeam(game, amount) {
    for (const pilot of livingPilots(game)) {
      pilot.hp = Math.min(pilot.maxHp, pilot.hp + amount);
    }
  }

  // ===========================================================================
  // 1. 双生裁决者 · 共振要塞 -- positional synchronisation.
  //    Every capture point must be held by a DIFFERENT pilot, so the number of
  //    points follows the party: 2 / 3 / 4. Two pilots keep the original
  //    geometry byte-for-byte, so existing rooms and tests see no change.
  // ===========================================================================
  const dualReactor = {
    type: 'boss_dual_reactor',
    label: '双生裁决者 · 共振要塞 (DUAL REACTOR)',
    baseHp: 7100, baseDamage: 32, radius: 52, speed: 74, color: '#72ffe0',

    create(game, x, y, hpScale, dmgScale) {
      return {
        type: this.type, name: '双生裁决者 · 共振要塞',
        isBoss: true, x, y, vx: 0, vy: 0,
        hp: Math.round(this.baseHp * hpScale), maxHp: Math.round(this.baseHp * hpScale),
        radius: this.radius, speed: this.speed, color: this.color,
        damage: Math.round(this.baseDamage * dmgScale),
        attackTimer: 0, volleyWindup: 0,
        coopCapture: 0, coopExposed: 0, arming: false, aimTimer: 0,
        coopScaled: false
      };
    },

    capturePoints(boss, partySize) {
      const count = Math.max(2, Math.min(4, partySize || 2));
      if (count === 2) {
        return [{ x: boss.x - 185, y: boss.y - 20 }, { x: boss.x + 185, y: boss.y + 20 }];
      }
      const points = [];
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (i / count) * TAU;
        points.push({ x: boss.x + Math.cos(angle) * 185, y: boss.y + Math.sin(angle) * 185 });
      }
      return points;
    },

    captureStatus(game, boss) {
      const team = livingPilots(game);
      const points = this.capturePoints(boss, team.length);
      const inside = (player, point) =>
        Math.hypot(player.x - point.x, player.y - point.y) <= TUNING.captureRadius;
      const occupied = points.map(point => team.some(p => inside(p, point)));
      // Each point needs its OWN pilot: with N points this takes N pilots, which
      // is what turns three and four pilots into a real coordination test.
      const holders = new Set();
      let synced = team.length >= points.length;
      for (const point of points) {
        const holder = team.find(p => !holders.has(p) && inside(p, point));
        if (holder) holders.add(holder); else synced = false;
      }
      return {
        points, occupied, count: holders.size, synced, both: synced,
        left: Boolean(occupied[0]), right: Boolean(occupied[1])
      };
    },

    update(game, boss, dt) {
      if (boss.coopExposed > 0) {
        boss.coopExposed = Math.max(0, boss.coopExposed - dt);
      } else {
        const status = this.captureStatus(game, boss);
        boss.coopCapture = status.synced
          ? Math.min(TUNING.captureSeconds, boss.coopCapture + dt)
          : Math.max(0, boss.coopCapture - dt * 1.8);
        if (boss.coopCapture >= TUNING.captureSeconds) {
          boss.coopCapture = 0;
          boss.coopExposed = TUNING.vulnerableSeconds;
          announce(game, boss, '双机同步解锁 · 核心暴露！', '#8ffff0', 20, 1.5);
          burst(game, boss, '#72ffe0');
        }
      }
      if (boss.volleyWindup > 0) {
        boss.volleyWindup -= dt;
        if (boss.volleyWindup <= 0) {
          boss.volleyWindup = 0;
          volley(game, boss, '#72ffe0', 20, 0.17);
        }
      } else {
        boss.attackTimer += dt;
        if (boss.attackTimer >= TUNING.dualVolleyInterval) {
          boss.attackTimer = 0;
          boss.volleyWindup = TUNING.dualVolleyWarning;
          announce(game, boss, '双路锁定 · 0.7秒后齐射', '#ffdd78', 16, 0.75);
        }
      }
      const nearest = nearestPilot(game, boss);
      if (nearest) {
        const angle = Math.atan2(nearest.y - boss.y, nearest.x - boss.x);
        boss.vx = Math.cos(angle) * boss.speed * 0.55;
        boss.vy = Math.sin(angle) * boss.speed * 0.55;
      }
    },

    damageMultiplier(game, boss) {
      return boss.coopExposed > 0 ? TUNING.exposedDamage : TUNING.shieldedDamage;
    },

    onVictory(game, boss) {
      healTeam(game, 25);
      game.player.crystals += 35;
      announce(game, boss, '双人挑战完成 · +35晶体 / 双机修复', '#9ffff0', 19, 2);
    },

    render(ctx, game, boss) {
      const status = this.captureStatus(game, boss);
      ctx.save();
      status.points.forEach((point, i) => {
        const taken = status.occupied[i];
        ctx.beginPath();
        ctx.arc(point.x, point.y, TUNING.captureRadius, 0, TAU);
        ctx.lineWidth = 3;
        ctx.strokeStyle = taken ? '#77ffcb' : '#ffb468';
        ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = taken ? '#77ffcb' : '#ffb468';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1} 号站位`, point.x, point.y - 99);
      });
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui';
      ctx.fillStyle = boss.coopExposed > 0 ? '#82ffe9' : '#ffdd98';
      ctx.fillText(boss.coopExposed > 0
        ? `核心暴露 ${boss.coopExposed.toFixed(1)}秒`
        : `同步破盾 ${Math.round(boss.coopCapture / TUNING.captureSeconds * 100)}%`
          + ` (${status.count}/${status.points.length} 人到位)`,
      boss.x, boss.y - 70);
      ctx.restore();
    }
  };

  // ===========================================================================
  // 2. 镜像壁垒 · 逆相护罩 -- directional pincer.
  //    The boss faces the party; the arena splits into two half-planes across
  //    that axis. Damage is 15% unless BOTH halves hold a pilot at once, which
  //    is the "attack from the left and the right together" rule. The split is
  //    derived from the replicated velocity and pilot positions, so the guest
  //    paints the same two flanks the host scored.
  // ===========================================================================
  const mirrorBastion = {
    type: 'boss_mirror_bastion',
    label: '镜像壁垒 · 逆相护罩 (MIRROR BASTION)',
    baseHp: 7800, baseDamage: 30, radius: 50, speed: 68, color: '#ff9f43',

    create(game, x, y, hpScale, dmgScale) {
      return {
        type: this.type, name: '镜像壁垒 · 逆相护罩',
        isBoss: true, x, y, vx: 1, vy: 0,
        hp: Math.round(this.baseHp * hpScale), maxHp: Math.round(this.baseHp * hpScale),
        radius: this.radius, speed: this.speed, color: this.color,
        damage: Math.round(this.baseDamage * dmgScale),
        attackTimer: 0,
        coopCapture: 0, coopExposed: 0,
        arming: true,           // shield up; false while the core is exposed
        aimTimer: 0,
        coopScaled: false
      };
    },

    /** Unit vector the shield faces. Velocity first, nearest pilot as fallback. */
    facing(game, boss) {
      const speed = Math.hypot(boss.vx || 0, boss.vy || 0);
      if (speed > 0.001) return { x: boss.vx / speed, y: boss.vy / speed };
      const nearest = nearestPilot(game, boss);
      if (!nearest) return { x: 1, y: 0 };
      const dx = nearest.x - boss.x, dy = nearest.y - boss.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    },

    /** Which pilots hold which half of the split, and whether both are held. */
    flankSplit(game, boss) {
      const facing = this.facing(game, boss);
      const left = [], right = [];
      for (const pilot of livingPilots(game)) {
        const dx = pilot.x - boss.x, dy = pilot.y - boss.y;
        if (Math.hypot(dx, dy) > TUNING.flankRange) continue;
        // 2D cross product: which side of the facing axis the pilot stands on.
        (facing.x * dy - facing.y * dx >= 0 ? left : right).push(pilot);
      }
      return { left, right, held: left.length > 0 && right.length > 0 };
    },

    update(game, boss, dt) {
      const nearest = nearestPilot(game, boss);
      if (nearest) {
        const angle = Math.atan2(nearest.y - boss.y, nearest.x - boss.x);
        boss.vx = Math.cos(angle) * boss.speed * 0.55;
        boss.vy = Math.sin(angle) * boss.speed * 0.55;
      }
      if (boss.coopExposed > 0) {
        boss.coopExposed = Math.max(0, boss.coopExposed - dt);
        boss.arming = false;
      } else {
        boss.arming = true;
        const split = this.flankSplit(game, boss);
        boss.coopCapture = split.held
          ? Math.min(TUNING.flankHoldSeconds, boss.coopCapture + dt)
          : Math.max(0, boss.coopCapture - dt * 1.8);
        if (boss.coopCapture >= TUNING.flankHoldSeconds) {
          boss.coopCapture = 0;
          boss.coopExposed = TUNING.flankExposeSeconds;
          boss.arming = false;
          announce(game, boss, '双翼夹击 · 逆相护罩瓦解！', '#ffd28a', 20, 1.5);
          burst(game, boss, '#ff9f43', 300);
        }
      }
      boss.attackTimer += dt;
      if (boss.attackTimer >= TUNING.flankVolleyInterval) {
        boss.attackTimer = 0;
        volley(game, boss, '#ffb86b', 18, 0.22, 255, 3.0);
      }
    },

    damageMultiplier(game, boss) {
      return boss.coopExposed > 0 ? TUNING.flankExposed : TUNING.flankShielded;
    },

    onVictory(game, boss) {
      healTeam(game, 30);
      game.player.crystals += 45;
      announce(game, boss, '双翼合围完成 · +45晶体 / 全队修复', '#ffd28a', 19, 2);
    },

    render(ctx, game, boss) {
      const facing = this.facing(game, boss);
      const split = this.flankSplit(game, boss);
      const nx = -facing.y, ny = facing.x;      // the split axis itself
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#ff9f43';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(boss.x - nx * TUNING.flankRange, boss.y - ny * TUNING.flankRange);
      ctx.lineTo(boss.x + nx * TUNING.flankRange, boss.y + ny * TUNING.flankRange);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // One marker per flank, so both ends read the same occupancy.
      [[-1, split.left, '左翼'], [1, split.right, '右翼']].forEach(([sign, pilots, label]) => {
        const x = boss.x + nx * sign * 200, y = boss.y + ny * sign * 200;
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, TAU);
        ctx.lineWidth = 3;
        ctx.strokeStyle = pilots.length ? '#77ffcb' : '#ff7a5c';
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = pilots.length ? '#77ffcb' : '#ff7a5c';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} ${pilots.length}`, x, y + 4);
      });
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui';
      ctx.fillStyle = boss.coopExposed > 0 ? '#ffd28a' : (split.held ? '#9dffd0' : '#ffb0a0');
      ctx.fillText(boss.coopExposed > 0
        ? `护罩瓦解 ${boss.coopExposed.toFixed(1)}秒`
        : (split.held
          ? `双翼夹击 ${Math.round(boss.coopCapture / TUNING.flankHoldSeconds * 100)}%`
          : '需左右两侧同时进攻'),
      boss.x, boss.y - 72);
      ctx.restore();
    }
  };

  // ===========================================================================
  // 3. 极性分裂 · 电荷枷锁 -- polarity pairing.
  //    Seats alternate + / -, and a rotating anchor only charges while one of
  //    each stands inside it. The orbit angle rides in `aimTimer`, which the
  //    generic renderer only reads for snipers, so nothing else consumes it.
  // ===========================================================================
  const polaritySplit = {
    type: 'boss_polarity_split',
    label: '极性分裂 · 电荷枷锁 (POLARITY SPLIT)',
    baseHp: 8200, baseDamage: 26, radius: 48, speed: 60, color: '#8f7dff',

    create(game, x, y, hpScale, dmgScale) {
      return {
        type: this.type, name: '极性分裂 · 电荷枷锁',
        isBoss: true, x, y, vx: 0, vy: 0,
        hp: Math.round(this.baseHp * hpScale), maxHp: Math.round(this.baseHp * hpScale),
        radius: this.radius, speed: this.speed, color: this.color,
        damage: Math.round(this.baseDamage * dmgScale),
        attackTimer: 0,
        coopCapture: 0, coopExposed: 0,
        arming: true,           // shield up; false while the core is exposed
        aimTimer: 0,            // anchor orbit angle
        coopScaled: false
      };
    },

    anchor(boss) {
      const angle = boss.aimTimer || 0;
      return {
        angle,
        x: boss.x + Math.cos(angle) * TUNING.anchorOrbit,
        y: boss.y + Math.sin(angle) * TUNING.anchorOrbit
      };
    },

    /**
     * The anchor demands a PAIR, never a single polarity: if it demanded one
     * sign, whichever pilot happened to carry that sign could break the shield
     * alone and the encounter would stop being a co-op mechanic. So it charges
     * only while one + and one - stand inside it at the same time.
     */
    anchorStatus(game, boss) {
      const zone = this.anchor(boss);
      const inside = visibleTeam(game).filter(({ pilot }) =>
        Math.hypot(pilot.x - zone.x, pilot.y - zone.y) <= TUNING.anchorRadius);
      const plus = inside.filter(({ id }) => polarityOfSeat(id) > 0).length;
      const minus = inside.length - plus;
      return { zone, inside, plus, minus, paired: plus > 0 && minus > 0 };
    },

    update(game, boss, dt) {
      boss.aimTimer = ((boss.aimTimer || 0) + dt * TUNING.anchorSpin) % TAU;
      if (boss.coopExposed > 0) {
        boss.coopExposed = Math.max(0, boss.coopExposed - dt);
        boss.arming = false;
      } else {
        boss.arming = true;
        const status = this.anchorStatus(game, boss);
        boss.coopCapture = status.paired
          ? Math.min(TUNING.polarityHoldSeconds, boss.coopCapture + dt)
          : Math.max(0, boss.coopCapture - dt * 1.8);
        if (boss.coopCapture >= TUNING.polarityHoldSeconds) {
          boss.coopCapture = 0;
          boss.coopExposed = TUNING.polarityExposeSeconds;
          boss.arming = false;
          announce(game, boss, '正负配对 · 电荷枷锁崩解！', '#b9a9ff', 20, 1.5);
          burst(game, boss, '#8f7dff', 300);
        }
      }
      const nearest = nearestPilot(game, boss);
      if (nearest) {
        const angle = Math.atan2(nearest.y - boss.y, nearest.x - boss.x);
        boss.vx = Math.cos(angle) * boss.speed * 0.5;
        boss.vy = Math.sin(angle) * boss.speed * 0.5;
      }
      boss.attackTimer += dt;
      if (boss.attackTimer >= TUNING.polarityVolleyInterval) {
        boss.attackTimer = 0;
        volley(game, boss, '#b9a9ff', 17, 0.20, 235, 3.2);
      }
    },

    damageMultiplier(game, boss) {
      return boss.coopExposed > 0 ? TUNING.polarityExposed : TUNING.polarityShielded;
    },

    onVictory(game, boss) {
      healTeam(game, 28);
      game.player.crystals += 40;
      announce(game, boss, '极性归位完成 · +40晶体 / 全队修复', '#b9a9ff', 19, 2);
    },

    render(ctx, game, boss) {
      const zone = this.anchor(boss);
      const status = this.anchorStatus(game, boss);
      ctx.save();
      // A two-tone ring: this zone wants one of EACH, so neither half is the
      // answer on its own and a lone pilot can never satisfy it.
      ctx.lineWidth = 4;
      ctx.globalAlpha = boss.coopExposed > 0 ? 0.3 : 0.9;
      ctx.strokeStyle = '#ff6b9d';
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, TUNING.anchorRadius, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = '#6bd5ff';
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, TUNING.anchorRadius, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = status.paired ? '#9dffd0' : '#d8d0ff';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('±', zone.x, zone.y + 7);
      // Every visible pilot wears its own polarity, so the pairing is readable.
      for (const { id, pilot } of visibleTeam(game)) {
        const sign = polarityOfSeat(id);
        ctx.fillStyle = sign > 0 ? '#ff6b9d' : '#6bd5ff';
        ctx.font = 'bold 14px system-ui';
        ctx.fillText(sign > 0 ? '+' : '−', pilot.x, pilot.y - 26);
      }
      ctx.font = 'bold 15px system-ui';
      ctx.fillStyle = boss.coopExposed > 0 ? '#b9a9ff' : '#d8d0ff';
      ctx.fillText(boss.coopExposed > 0
        ? `枷锁崩解 ${boss.coopExposed.toFixed(1)}秒`
        : `正负配对 ${Math.round(boss.coopCapture / TUNING.polarityHoldSeconds * 100)}%`
          + ` (需 + 与 − 同时在圈内)`,
      boss.x, boss.y - 70);
      ctx.restore();
    }
  };

  // --- registry --------------------------------------------------------------
  const REGISTRY = Object.freeze({
    [dualReactor.type]: dualReactor,
    [mirrorBastion.type]: mirrorBastion,
    [polaritySplit.type]: polaritySplit
  });
  const ROTATION = Object.freeze([dualReactor, mirrorBastion, polaritySplit]);

  function isCoopBoss(type) {
    return Boolean(type) && Object.prototype.hasOwnProperty.call(REGISTRY, type);
  }

  /** The archetype for a boss cycle. Every second boss is a co-op encounter. */
  function forCycle(cycle) {
    const index = Math.max(0, Math.floor((cycle || 2) / 2) - 1);
    return ROTATION[index % ROTATION.length];
  }

  function create(game, x, y, hpScale, dmgScale) {
    return forCycle(game?.bossCycle).create(game, x, y, hpScale, dmgScale);
  }

  function createOf(type, game, x, y, hpScale, dmgScale) {
    const entry = REGISTRY[type];
    return entry ? entry.create(game, x, y, hpScale, dmgScale) : null;
  }

  window.NeonLanCoopBosses = Object.freeze({
    TUNING, REGISTRY, ROTATION, isCoopBoss, forCycle, create, createOf,
    capturePoints: (boss, partySize) =>
      dualReactor.capturePoints(boss, partySize),
    captureStatus: (game, boss) => dualReactor.captureStatus(game, boss),
    update(game, boss, dt) {
      const entry = REGISTRY[boss?.type];
      if (entry) entry.update(game, boss, dt);
    },
    damageMultiplier(game, boss) {
      const entry = REGISTRY[boss?.type];
      return entry ? entry.damageMultiplier(game, boss) : 1;
    },
    onVictory(game, boss) {
      const entry = REGISTRY[boss?.type];
      if (entry) entry.onVictory(game, boss);
    },
    render(ctx, game, boss) {
      const entry = REGISTRY[boss?.type];
      if (entry) entry.render(ctx, game, boss);
    },
    // Exposed for the host-side callers that need a stable seat identity.
    polarityOfSeat, visibleTeam, hostTeam, guestTeam, livingPilots
  });
})();
