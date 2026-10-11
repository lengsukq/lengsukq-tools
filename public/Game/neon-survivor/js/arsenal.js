/* Legendary passive: 星穹火控矩阵 (Starfield Fire-Control Matrix).
 * One bounded automatic salvo shared by all builds, independent of extra bullet counts.
 */
(() => {
  'use strict';
  const levels = Object.freeze([
    { projectiles: 0, targets: 0, cooldown: 0, damage: 0 },
    { projectiles: 1, targets: 1, cooldown: 8.0, damage: 40 },
    { projectiles: 1, targets: 2, cooldown: 6.5, damage: 55 },
    { projectiles: 2, targets: 3, cooldown: 6.5, damage: 65 },
    { projectiles: 2, targets: 4, cooldown: 5.0, damage: 85 },
    { projectiles: 3, targets: 5, cooldown: 3.5, damage: 105 }
  ]);

  function config(level) {
    return levels[Math.min(5, Math.max(0, Math.floor(level || 0)))] || levels[0];
  }

  function update(game, dt) {
    if (game.state !== 'playing') return;
    const player = game.player;
    const lvl = player.passives?.multishot || 0;
    if (!lvl) return;
    const cfg = config(lvl);
    player.arsenalEchoTimer = Math.min(cfg.cooldown, (player.arsenalEchoTimer || 0) + dt);
    if (player.arsenalEchoTimer < cfg.cooldown) return;

    // A small, hard-capped scan; do not multiply the number of physical missiles.
    const targets = (game.enemies || [])
      .filter(enemy => !enemy.dead && enemy.hp > 0 &&
        Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 650)
      .sort((a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y))
      .slice(0, cfg.targets);
    if (!targets.length) return;
    player.arsenalEchoTimer = 0;

    const baseDamage = cfg.damage * player.dmgMultiplier;
    for (const enemy of targets) {
      if ((game.particles?.length || 0) < 100) {
        game.particles.push({
          type: 'lightning',
          x1: player.x, y1: player.y, x2: enemy.x, y2: enemy.y,
          color: '#ffd86b', life: 0.24, maxLife: 0.24
        });
      }
      game.dealDamage(enemy, baseDamage, 'arsenal_echo');
    }
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: player.x, y: player.y, radius: 6, maxRadius: 65,
        alpha: 0.8, color: '#ffd86b'
      });
    }
  }

  window.NeonLegendaryArsenal = Object.freeze({ config, update });
})();
