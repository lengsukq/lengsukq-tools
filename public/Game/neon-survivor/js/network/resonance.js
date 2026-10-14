/* Host-authoritative co-op resonance: nearby ships contribute class auras.
 * RIFTBLADE contributes damage, ASTRA periodically supplies a bounded shield,
 * PHANTOM contributes crit chance. The link never grants benefits to a downed
 * or disconnected pilot.
 *
 * Every contribution here has to be APPLIED somewhere. `critBonus` was not: it
 * was computed, returned, and read by nobody, so two Phantoms standing together
 * received nothing at all -- the damage bonus requires a Riftblade and the
 * shield requires an Astra. tests/neon-survivor-resonance now proves the crit
 * reaches the damage roll.
 */
(() => {
  'use strict';
  const NEAR = 180;
  const LINK = 340;
  const DASH_WINDOW = 0.55;
  const DASH_RADIUS = 170;
  const PULSE_COOLDOWN = 8;
  const SHIELD_INTERVAL = 12;
  const SHIELD_DURATION = 6;
  // How fast an un-earned shield charge drains while the link is broken. It used
  // to be discarded outright, so twelve seconds of proximity were lost to a
  // single frame apart -- which made the Astra shield effectively unobtainable
  // in a real fight. Draining at twice the fill rate still requires the pair to
  // stay together, without punishing a moment's separation.
  const SHIELD_DRAIN_RATE = 2;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const ship = pilot => pilot?.shipId || 'riftblade'; // legacy saves
  const live = pilot => pilot && pilot.hp > 0 && !pilot.downed;
  const round = value => Math.round(value * 10) / 10;

  function link(host, ally, options = {}) {
    if (!live(host) || !live(ally)) {
      return { distance: 0, active: false, tier: 0, damageBonus: 0, shieldSource: false };
    }
    const distance = Math.hypot(host.x - ally.x, host.y - ally.y);
    const tier = distance <= NEAR ? 2 : distance <= LINK ? 1 : 0;
    const level = Math.max(1, Math.floor(Math.max(host.level || 1, ally.level || 1)));
    const threatFactor = clamp(Number(options.threatFactor) || 1, .9, 1.1);
    const attackSource = ship(host) === 'riftblade' || ship(ally) === 'riftblade';
    const isDocked = Boolean((host.phantom?.docked && host.phantom?.carrier === ally) ||
                             (ally.phantom?.docked && ally.phantom?.carrier === host) ||
                             host.hasDockedGunner || ally.hasDockedGunner);
    let damageBonus = tier && attackSource ? Number(Math.min(tier === 2 ? .18 : .12,
      (.05 + .003 * (level - 1)) * (tier === 2 ? 1.6 : 1) * threatFactor).toFixed(6)) : 0;
    if (isDocked && attackSource) {
      damageBonus = Math.max(damageBonus, 0.20);
    }
    const critSource = Boolean(tier && (ship(host) === 'phantom' || ship(ally) === 'phantom'));
    const critBonus = critSource ? (tier === 2 ? 0.12 : 0.06) : 0;
    return {
      distance, active: tier > 0, tier, damageBonus,
      shieldSource: Boolean(tier && (ship(host) === 'astra' || ship(ally) === 'astra')),
      critSource,
      critBonus,
      docked: isDocked
    };
  }

  // Sampling a few living, non-boss enemies avoids arbitrary Boss HP spikes
  // and remains cheap with large enemy waves. Threat changes smoothly.
  function threat(game, previous, dt) {
    const values = [];
    for (const enemy of game.enemies || []) {
      if (!enemy.dead && !enemy.isBoss && Number.isFinite(enemy.damage)) {
        values.push(clamp(enemy.damage, 8, 40));
        if (values.length >= 25) break;
      }
    }
    values.sort((a, b) => a - b);
    const typical = values.length ? values[Math.floor(values.length / 2)] : 12;
    const difficulty = clamp(Number(game.difficulty) || 0, 0, 6);
    const target = clamp(1 + (difficulty - 2) * .012 + (typical - 12) * .0025, .9, 1.1);
    return (Number.isFinite(previous) ? previous : 1) +
      (target - (Number.isFinite(previous) ? previous : 1)) * clamp(dt / 5, 0, 1);
  }

  function shieldAmount(player, level, typical, near) {
    const raw = (8 + .9 * (level - 1) + .3 * typical) * (near ? 1.25 : 1);
    return round(Math.max(0, Math.min(45, (player.maxHp || 100) * .30, raw)));
  }

  function grantShield(player, amount, now) {
    if (!live(player) || amount <= 0) return false;
    const old = player.coopShield;
    if (old && old.expiresAt > now && old.value >= amount) return false;
    player.coopShield = { value: amount, expiresAt: now + SHIELD_DURATION };
    return true;
  }

  // Called at the actual damage site; returning an unchanged amount in solo
  // mode or after expiry is intentional. Damage never adds iframe immunity.
  function absorb(player, amount, now) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const shield = player?.coopShield;
    if (!shield) return amount;
    if (!(shield.expiresAt > now) || shield.value <= 0) {
      player.coopShield = null;
      return amount;
    }
    const blocked = Math.min(amount, shield.value);
    shield.value = round(Math.max(0, shield.value - blocked));
    if (shield.value <= 0) player.coopShield = null;
    return amount - blocked;
  }

  function remainingShield(player, now) {
    const shield = player?.coopShield;
    return shield?.expiresAt > now ? round(Math.max(0, shield.value)) : 0;
  }

  function update(game, ally, state, dt) {
    if (!Number.isFinite(dt) || dt <= 0 || game?.state !== 'playing') return state.link || link(game.player, ally);
    state.threatFactor = threat(game, state.threatFactor, dt);
    const result = link(game.player, ally, { threatFactor: state.threatFactor });
    const previousTier = state.link?.tier || 0;
    state.link = result;
    state.pulseCooldown = Math.max(0, (state.pulseCooldown || 0) - dt);
    if (result.tier > previousTier) announceTier(game, ally, result);
    if (!result.active || !result.shieldSource) {
      // Drain rather than discard, so a moment apart does not throw away the
      // whole charge.
      state.shieldTimer = Math.max(0, (state.shieldTimer || 0) - dt * SHIELD_DRAIN_RATE);
      state.linkStable = Math.max(0, (state.linkStable || 0) - dt);
      return result;
    }
    state.linkStable = Math.min(1, (state.linkStable || 0) + dt);
    state.shieldTimer = Math.min(SHIELD_INTERVAL, (state.shieldTimer || 0) + dt);
    if (state.linkStable >= 1 && state.shieldTimer >= SHIELD_INTERVAL) {
      state.shieldTimer = 0;
      const candidates = (game.enemies || []).filter(e =>
        !e.dead && !e.isBoss && Number.isFinite(e.damage)).slice(0, 25)
        .map(e => clamp(e.damage, 8, 40)).sort((a, b) => a - b);
      const typical = candidates.length ? candidates[Math.floor(candidates.length / 2)] : 12;
      const level = Math.max(1, Math.floor(Math.max(game.player.level || 1, ally.level || 1)));
      const now = game.survivalTime || 0;
      for (const player of [game.player, ally]) {
        grantShield(player, shieldAmount(player, level, typical, result.tier === 2), now);
      }
    }
    return result;
  }

  /** Say so when the link gets STRONGER. The only previous feedback was a
   *  slightly brighter dashed line, so entering the strong tier was invisible.
   *  Only rising tiers are announced: the boundary is crossed constantly, and a
   *  banner on every separation would be noise.
   *
   *  Pushed into the authoritative effect arrays, so the host sees it at once and
   *  a guest receives it through the ordinary snapshot layers. */
  function announceTier(game, ally, result) {
    const x = (game.player.x + ally.x) / 2;
    const y = (game.player.y + ally.y) / 2;
    if ((game.texts?.length || 0) < 35) {
      game.texts.push({
        x, y: y - 52,
        text: result.tier === 2 ? '⚡ 双机联动 Ⅱ' : '⚡ 双机联动 Ⅰ',
        color: result.tier === 2 ? '#7affda' : '#8fd4ff',
        size: result.tier === 2 ? 19 : 16,
        life: 1.1, maxLife: 1.1
      });
    }
    if (result.tier === 2 && (game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x, y, radius: 14, maxRadius: 120, color: '#7affda', alpha: .8
      });
    }
  }

  function recordDash(game, ally, state, who, time) {
    const now = Number.isFinite(time) ? time : game.survivalTime;
    const other = who === 'host' ? 'guest' : 'host';
    const last = state.lastDash?.[other];
    state.lastDash ||= {};
    state.lastDash[who] = now;
    const result = link(game.player, ally);
    if (!result.active || result.distance > 260 || state.pulseCooldown > 0 ||
      !Number.isFinite(last) || now - last < 0 || now - last > DASH_WINDOW) return false;
    state.pulseCooldown = PULSE_COOLDOWN;
    state.lastDash = {};
    const x = (game.player.x + ally.x) / 2;
    const y = (game.player.y + ally.y) / 2;
    let count = 0;
    for (const enemy of game.enemies) {
      if (enemy.dead || Math.hypot(enemy.x - x, enemy.y - y) > DASH_RADIUS) continue;
      game.dealDamage(enemy, 110 * game.player.dmgMultiplier, 'lan-resonance');
      if (++count >= 18) break;
    }
    if (game.shockwaves?.length < 40) {
      game.shockwaves.push({ x, y, radius: 12, maxRadius: DASH_RADIUS, color: '#7ef8ff', alpha: 1 });
    }
    if (game.texts?.length < 35) {
      game.texts.push({ x, y: y - 45, text: '双星共振！', color: '#bbfaff', size: 20, life: 1.2, maxLife: 1.2 });
    }
    return true;
  }
  /** Paint the link: a pulsing ground ring under each ship and a beam with
   *  flowing motes between them.
   *
   *  Shared by the host's overlay and the guest's renderer, so both screens show
   *  the same thing -- the presentation used to be two hand-written draw blocks
   *  inside coop.js that could drift apart. Deliberately a handful of strokes
   *  and fills: this runs for every linked ship at 60fps on top of the whole
   *  world render.
   *
   *  `time` is seconds; any monotonic clock will do, it only drives the pulse.
   */
  function drawLink(ctx, from, to, result, time = 0) {
    if (!ctx || !from || !to || !result?.active) return false;
    const strong = result.tier === 2;
    const t = Number.isFinite(time) ? time : 0;
    const pulse = .5 + .5 * Math.sin(t * (strong ? 3.4 : 2.2));
    const rgb = strong ? '122,255,218' : '100,196,255';
    const radius = Math.max(20, Math.min(46, (from.radius || 16) * 1.7));
    ctx.save();
    ctx.setLineDash([]);
    // Ground rings, one per ship, drawn as squashed ellipses at the ship's feet.
    for (const pilot of [from, to]) {
      const cy = pilot.y + radius * .55;
      ctx.strokeStyle = `rgba(${rgb},${(.22 + .3 * pulse).toFixed(3)})`;
      ctx.lineWidth = strong ? 3 : 2;
      ctx.beginPath();
      ctx.ellipse(pilot.x, cy, radius, radius * .42, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (strong) {
        ctx.strokeStyle = `rgba(${rgb},${(.12 + .18 * pulse).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(pilot.x, cy, radius * 1.34, radius * .56, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // The beam itself, with the dashes crawling so it reads as flowing.
    ctx.strokeStyle = strong ? 'rgba(122,255,218,.72)' : 'rgba(100,196,255,.46)';
    ctx.lineWidth = strong ? 3 : 2;
    ctx.setLineDash([11, 8]);
    ctx.lineDashOffset = -t * 26;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Motes travelling along the beam.
    const dx = to.x - from.x, dy = to.y - from.y;
    const motes = strong ? 4 : 2;
    ctx.fillStyle = strong ? '#bdf8ff' : '#8fd4ff';
    for (let i = 0; i < motes; i++) {
      const k = ((t * (strong ? .55 : .38)) + i / motes) % 1;
      ctx.beginPath();
      ctx.arc(from.x + dx * k, from.y + dy * k, strong ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return true;
  }

  window.NeonLanResonance = Object.freeze({
    NEAR, LINK, PULSE_COOLDOWN, SHIELD_INTERVAL, SHIELD_DURATION, SHIELD_DRAIN_RATE,
    link, threat, shieldAmount, grantShield, absorb, remainingShield, update, recordDash,
    drawLink
  });
})();
