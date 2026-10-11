/* Host-authoritative co-op resonance: nearby ships contribute class auras.
 * RIFTBLADE contributes damage, ASTRA periodically supplies a bounded shield.
 * The link never grants benefits to a downed or disconnected pilot.
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
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const ship = pilot => pilot?.shipId || 'riftblade'; // legacy saves
  const live = pilot => pilot && pilot.hp > 0 && !pilot.downed;
  const round = value => Math.round(value * 10) / 10;

  function link(host, ally, options = {}) {
    if (!live(host) || !live(ally)) {
      return { distance: 0, active: false, tier: 0, damageBonus: 0, regen: false, shieldSource: false };
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
      distance, active: tier > 0, tier, damageBonus, regen: false,
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
    state.link = result;
    state.pulseCooldown = Math.max(0, (state.pulseCooldown || 0) - dt);
    if (!result.active || !result.shieldSource) {
      state.shieldTimer = 0;
      state.linkStable = 0;
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
  window.NeonLanResonance = Object.freeze({
    NEAR, LINK, PULSE_COOLDOWN, SHIELD_INTERVAL, SHIELD_DURATION,
    link, threat, shieldAmount, grantShield, absorb, remainingShield, update, recordDash
  });
})();
