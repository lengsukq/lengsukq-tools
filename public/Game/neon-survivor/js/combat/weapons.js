/* Shared host-authoritative weapon firing rules.
 * One pilot at a time; no assumptions about 'host' or 'guest'. All spawned
 * effects live in the SAME world owned by the host. Per-pilot timers stay
 * attached to that pilot, so new teammates never share firing cooldowns.
 */
(() => {
  'use strict';
  const RULES = Object.freeze({
    blaster: Object.freeze({ base: .35, reduction: .05, minimum: .12, method: 'fireBlaster' }),
    tesla: Object.freeze({ base: 2, reduction: .25, minimum: .6, method: 'fireTesla' }),
    missiles: Object.freeze({ base: 2.4, reduction: .3, minimum: .8, method: 'fireMissiles' }),
    nova: Object.freeze({ base: 5, reduction: .6, minimum: 2, method: 'fireNova' }),
    laser: Object.freeze({ base: 2, reduction: .28, minimum: .65, method: 'fireLaser' }),
    blackhole: Object.freeze({ base: 5.5, reduction: .6, minimum: 2.4, method: 'fireBlackHole' }),
    cryomine: Object.freeze({ base: 3, reduction: .35, minimum: 1.2, method: 'fireCryoMine' })
  });

  function cooldown(id, level, cdrMultiplier = 1) {
    const rule = typeof id === 'string' && Object.hasOwn(RULES, id) ? RULES[id] : null;
    if (!rule || !Number.isFinite(level) || level < 1 ||
        !Number.isFinite(cdrMultiplier) || cdrMultiplier <= 0) return null;
    return Math.max(rule.minimum, rule.base - (level - 1) * rule.reduction) * cdrMultiplier;
  }

  function tick(timers, id, level, cdrMultiplier, dt) {
    const interval = cooldown(id, level, cdrMultiplier);
    if (!timers || interval === null || !Number.isFinite(dt) || dt <= 0) return false;
    const elapsed = Math.max(0, timers[id] || 0) + dt;
    if (elapsed < interval) {
      timers[id] = elapsed;
      return false;
    }
    // Preserve legacy behavior: never burst-fire past frames after a lag spike.
    timers[id] = 0;
    return true;
  }

  function fire(game, pilot, id, level) {
    const rule = typeof id === 'string' && Object.hasOwn(RULES, id) ? RULES[id] : null;
    if (!game || !pilot || pilot.downed || pilot.hp <= 0 ||
        !rule || typeof game[rule.method] !== 'function') return false;
    // Local authoritative host uses the actual world object so effects like
    // screen shake / weapon hooks do not get shadowed by a proxy context.
    const source = pilot === game.player ? game : Object.create(game);
    if (source !== game) source.player = pilot;
    // Instant hits (Tesla, Nova, Laser) must use the shooter's own stats.
    if (source !== game) {
      source.dealDamage = (enemy, amount, kind, forcedCritical) =>
        game.dealDamage(enemy, amount, kind, forcedCritical, pilot);
    }

    const arrays = ['bullets', 'blackHoles', 'mines', 'laserBeams'];
    const counts = arrays.map(name => game[name]?.length || 0);
    game[rule.method].call(source, level);
    // Persistent projectiles/effects carry stable ownership metadata. The
    // legacy `owner` field is retained for existing guest weapon tests.
    const ownerId = pilot.playerId || pilot.id || (pilot === game.player ? 'host' : 'guest');
    for (let i = 0; i < arrays.length; i++) {
      const values = game[arrays[i]] || [];
      for (let k = counts[i]; k < values.length; k++) {
        values[k].owner = ownerId;
        values[k].ownerId = ownerId;
      }
    }
    return true;
  }

  function update(game, pilot, dt) {
    if (!game || !pilot || pilot.hp <= 0 || pilot.downed ||
        !Number.isFinite(dt) || dt <= 0) return 0;
    const timers = pilot.timers ||= {};
    const weapons = pilot.weapons || {};
    const cdr = pilot.cdrMultiplier || 1;
    let fired = 0;
    for (const [id, level] of Object.entries(weapons)) {
      if (!Object.hasOwn(RULES, id) || !level) continue;
      if (!tick(timers, id, level, cdr, dt)) continue;
      if ((game.bullets?.length || 0) > 180 || (game.enemyBullets?.length || 0) > 140) continue;
      if (fire(game, pilot, id, level)) fired++;
    }
    return fired;
  }

  window.NeonWeaponSystem = Object.freeze({ RULES, cooldown, tick, fire, update });
})();
