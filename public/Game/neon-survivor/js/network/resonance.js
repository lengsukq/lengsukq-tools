/* V4 cooperation bonuses. All combat/health changes are host-authoritative.
 * A brief proximity window encourages coordinated movement, while the dual-dash
 * burst needs intentional timing; neither can bypass dash charge / shield limits.
 */
(() => {
  'use strict';
  const NEAR = 180;
  const LINK = 340;
  const DASH_WINDOW = 0.55;
  const DASH_RADIUS = 170;
  const PULSE_COOLDOWN = 8;
  function link(host, ally) {
    if (!host || !ally || host.hp <= 0 || ally.hp <= 0) {
      return { distance: 0, active: false, tier: 0, damageBonus: 0, regen: false };
    }
    const distance = Math.hypot(host.x - ally.x, host.y - ally.y);
    const tier = distance <= NEAR ? 2 : distance <= LINK ? 1 : 0;
    return { distance, active: tier > 0, tier, damageBonus: tier === 2 ? 0.20 : tier === 1 ? 0.10 : 0,
      regen: tier === 2 };
  }
  function update(game, ally, state, dt) {
    const result = link(game.player, ally);
    state.link = result;
    if (result.regen) {
      // Close formation recovers health slowly; no healing a downed ship.
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 0.8 * dt);
      ally.hp = Math.min(ally.maxHp, ally.hp + 0.8 * dt);
    }
    state.pulseCooldown = Math.max(0, (state.pulseCooldown || 0) - dt);
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
      // Damage is resolved once on the host. No unlimited chain-trigger.
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
  window.NeonLanResonance = Object.freeze({ NEAR, LINK, PULSE_COOLDOWN, link, update, recordDash });
})();
