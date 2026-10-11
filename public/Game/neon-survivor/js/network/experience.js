/* Co-op XP policy: one authoritative TEAM pool, no pickup competition.
 *
 * Every gem is consumed once by the host and contributes its full value to
 * the existing leveling curve. Both players share level/XP progress, while
 * health and other personal consumables belong to the collecting ship.
 * A map magnet affects only XP gems and pulls them to the nearest living ship.
 */
(() => {
  'use strict';
  function active(game) {
    return Boolean(game?.lanCoop?.ally && game.lanCoop.rtc?.connected &&
      game.lanCoop.rtc.role === 'host');
  }
  function collector(game, gem) {
    const host = game.player;
    if (!active(game)) return host;
    const ally = game.lanCoop.ally;
    if (!ally || ally.hp <= 0) return host;
    if (host.hp <= 0) return ally;
    const distance = entity => Math.hypot(gem.x - entity.x, gem.y - entity.y);
    return distance(ally) < distance(host) ? ally : host;
  }
  function pickupRadius(game, target) {
    return target === game.player ? game.player.magnetRadius :
      120 * (1 + Math.min(5, target.passives?.magnet || 0) * .5) +
        Math.min(100, Math.max(0, (target.level - 1) * 2));
  }
  function activateMapMagnet(game) {
    // Ignore uncollected health / nukes / magnet items. The magnet is a
    // TEAM experience pickup, not a remote consumable activation.
    let count = 0;
    for (const item of game.gems) {
      if (item.type !== 'gem') continue;
      item.magnetized = true;
      count++;
    }
    return count;
  }
  function synchronizeLevel(game) {
    if (!active(game)) return;
    const ally = game.lanCoop.ally;
    // Each team level-up grants BOTH pilots one independent upgrade card.
    if (game.player.level > ally.level) {
      ally.pendingUpgrades = (ally.pendingUpgrades || 0) +
        (game.player.level - ally.level);
    }
    ally.level = game.player.level;
    ally.xp = game.player.xp;
    ally.xpNeeded = game.player.xpNeeded;
  }
  function progress(game) {
    return {
      xp: Math.max(0, Math.round(game.player?.xp || 0)),
      xpNeeded: Math.max(1, Math.round(game.player?.xpNeeded || 1)),
      level: Math.max(1, Math.round(game.player?.level || 1))
    };
  }
  window.NeonLanExperience = Object.freeze({
    active, collector, pickupRadius, activateMapMagnet,
    synchronizeLevel, progress
  });
})();
