/* Host-authoritative co-op difficulty and a co-op-only dual-reactor boss.
 * No additional server is needed; the LAN host simulates every mechanic.
 */
(() => {
  'use strict';
  const TUNING = Object.freeze({
    normalHp: 1.35, eliteHp: 1.45, bossHp: 1.65,
    enemyDamage: 1.12, spawnInterval: 0.9,
    captureRadius: 88, captureSeconds: 1.4,
    vulnerableSeconds: 9, shieldedDamage: 0.45,
    dualVolleyInterval: 3.6, dualVolleyWarning: 0.7,
    maxEnemyBullets: 130
  });
  function active(game) {
    return Boolean(game?.lanCoop?.ally && game.lanCoop.rtc?.connected &&
      game.lanCoop.rtc.role === 'host');
  }
  function scaleNewEnemies(game) {
    if (!active(game)) return;
    for (const enemy of game.enemies || []) {
      if (enemy.coopScaled) continue;
      const multiplier = enemy.isBoss ? TUNING.bossHp :
        enemy.isElite ? TUNING.eliteHp : TUNING.normalHp;
      enemy.hp = Math.round(enemy.hp * multiplier);
      enemy.maxHp = Math.round(enemy.maxHp * multiplier);
      enemy.coopScaled = true;
    }
  }
  function createDualBoss(game, x, y, hpScale, dmgScale) {
    return {
      type: 'boss_dual_reactor',
      name: '双生裁决者 · 共振要塞',
      isBoss: true, x, y, vx: 0, vy: 0,
      hp: Math.round(7100 * hpScale), maxHp: Math.round(7100 * hpScale),
      radius: 52, speed: 74, color: '#72ffe0', damage: Math.round(32 * dmgScale),
      attackTimer: 0, volleyWindup: 0,
      coopCapture: 0, coopExposed: 0, coopScaled: false
    };
  }
  function capturePoints(boss) {
    return [
      { x: boss.x - 185, y: boss.y - 20 },
      { x: boss.x + 185, y: boss.y + 20 }
    ];
  }
  function captureStatus(game, boss) {
    const ally = game.lanCoop?.ally;
    const host = game.player;
    if (!active(game) || host.hp <= 0 || !ally || ally.hp <= 0) {
      return { left: false, right: false, both: false };
    }
    const [left, right] = capturePoints(boss);
    const inside = (player, point) =>
      Math.hypot(player.x - point.x, player.y - point.y) <= TUNING.captureRadius;
    const leftHost = inside(host, left), rightHost = inside(host, right);
    const leftGuest = inside(ally, left), rightGuest = inside(ally, right);
    return {
      left: leftHost || leftGuest, right: rightHost || rightGuest,
      both: leftHost && rightGuest || leftGuest && rightHost
    };
  }
  function shoot(game, boss) {
    if (game.enemyBullets.length >= TUNING.maxEnemyBullets - 8) return;
    const players = [game.player, game.lanCoop.ally];
    for (const player of players) {
      if (!player || player.hp <= 0) continue;
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * 0.17;
        game.enemyBullets.push({
          x: boss.x, y: boss.y, vx: Math.cos(a) * 245, vy: Math.sin(a) * 245,
          radius: 5, color: '#72ffe0', damage: 20, life: 3.3
        });
      }
    }
  }
  function updateBoss(game, boss, dt) {
    if (boss.dead) return;
    const ally = game.lanCoop?.ally;
    if (!active(game) || !ally) {
      boss.coopExposed = Math.max(boss.coopExposed, 1);
      boss.coopCapture = 0;
      return;
    }
    if (boss.coopExposed > 0) {
      boss.coopExposed = Math.max(0, boss.coopExposed - dt);
    } else {
      const status = captureStatus(game, boss);
      boss.coopCapture = status.both ? Math.min(TUNING.captureSeconds, boss.coopCapture + dt)
        : Math.max(0, boss.coopCapture - dt * 1.8);
      if (boss.coopCapture >= TUNING.captureSeconds) {
        boss.coopCapture = 0;
        boss.coopExposed = TUNING.vulnerableSeconds;
        game.texts.push({ x: boss.x, y: boss.y - 80,
          text: '双机同步解锁 · 核心暴露！', color: '#8ffff0', size: 20,
          life: 1.5, maxLife: 1.5 });
        game.shockwaves.push({ x: boss.x, y: boss.y, radius: 15, maxRadius: 280,
          alpha: 1, color: '#72ffe0' });
      }
    }
    if (boss.volleyWindup > 0) {
      boss.volleyWindup -= dt;
      if (boss.volleyWindup <= 0) {
        boss.volleyWindup = 0;
        shoot(game, boss);
      }
    } else {
      boss.attackTimer += dt;
      if (boss.attackTimer >= TUNING.dualVolleyInterval) {
        boss.attackTimer = 0;
        boss.volleyWindup = TUNING.dualVolleyWarning;
        game.texts.push({ x: boss.x, y: boss.y - 75,
          text: '双路锁定 · 0.7秒后齐射', color: '#ffdd78',
          size: 16, life: 0.75, maxLife: 0.75 });
      }
    }
    const targets = [game.player, ally].filter(p => p && p.hp > 0);
    const nearest = targets.sort((a, b) =>
      Math.hypot(a.x - boss.x, a.y - boss.y) -
      Math.hypot(b.x - boss.x, b.y - boss.y))[0];
    if (nearest) {
      const angle = Math.atan2(nearest.y - boss.y, nearest.x - boss.x);
      boss.vx = Math.cos(angle) * boss.speed * 0.55;
      boss.vy = Math.sin(angle) * boss.speed * 0.55;
    }
  }
  function modifyBossDamage(game, boss, amount) {
    if (boss.type !== 'boss_dual_reactor' || !active(game)) return amount;
    return amount * (boss.coopExposed > 0 ? 1.25 : TUNING.shieldedDamage);
  }
  function renderBoss(ctx, game, boss) {
    if (boss?.dead || boss?.type !== 'boss_dual_reactor' || !active(game)) return;
    const points = capturePoints(boss);
    const status = captureStatus(game, boss);
    ctx.save();
    points.forEach((p, i) => {
      const taken = i === 0 ? status.left : status.right;
      ctx.beginPath();
      ctx.arc(p.x, p.y, TUNING.captureRadius, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = taken ? '#77ffcb' : '#ffb468';
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = taken ? '#77ffcb' : '#ffb468';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? '① 房主/队友站位' : '② 另一位玩家站位', p.x, p.y - 99);
    });
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui';
    ctx.fillStyle = boss.coopExposed > 0 ? '#82ffe9' : '#ffdd98';
    const label = boss.coopExposed > 0
      ? `核心暴露 ${boss.coopExposed.toFixed(1)}秒`
      : `双点同步破盾 ${Math.round(boss.coopCapture / TUNING.captureSeconds * 100)}%`;
    ctx.fillText(label, boss.x, boss.y - 70);
    ctx.restore();
  }
  function bonusOnVictory(game, boss) {
    if (boss.type !== 'boss_dual_reactor' || !active(game)) return;
    const ally = game.lanCoop.ally;
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
    ally.hp = Math.min(ally.maxHp, ally.hp + 25);
    game.player.crystals += 35;
    game.texts.push({ x: boss.x, y: boss.y - 95, text: '双人挑战完成 · +35晶体 / 双机修复',
      color: '#9ffff0', size: 19, life: 2, maxLife: 2 });
  }
  window.NeonLanEncounters = Object.freeze({
    TUNING, active, scaleNewEnemies, createDualBoss, capturePoints,
    captureStatus, updateBoss, modifyBossDamage, renderBoss, bonusOnVictory
  });
})();
