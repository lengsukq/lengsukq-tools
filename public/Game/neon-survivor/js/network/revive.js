/* Host-authoritative, symmetric co-op last-stand / rescue.
 * Escalation is GLOBAL across both pilots for the duration of one run.
 * Pause and upgrade selection freeze every countdown; no wall-clock timers.
 */
(() => {
  'use strict';
  const BASE_SECONDS = 8;
  const EXTRA_SECONDS = 4;
  const MAX_SECONDS = 40;
  const NEAR_DISTANCE = 145;
  const NEAR_PREPARE = 3;
  const NEAR_MULTIPLIER = 2;

  function active(game) {
    return Boolean(game?.lanCoop?.ally && game.lanCoop.rtc?.connected &&
      game.lanCoop.rtc.role === 'host');
  }
  const alive = pilot => Boolean(pilot && pilot.hp > 0 && !pilot.downed);
  function newRun() {
    return { deaths: 0, totalHoldSeconds: 0, lastStand: null };
  }
  function summary(game) {
    const run = game.lanCoop?.rescue || newRun();
    const stand = run.lastStand;
    return {
      deaths: run.deaths,
      totalHoldSeconds: Math.round(run.totalHoldSeconds * 10) / 10,
      fallen: stand?.role || null,
      duration: stand?.duration || 0,
      remaining: Math.max(0, Math.ceil(stand?.remaining || 0)),
      assistance: Boolean(stand?.assistance)
    };
  }
  function knockDown(game, role) {
    if (!active(game)) return false;
    const coop = game.lanCoop;
    const downed = role === 'host' ? game.player : coop.ally;
    const other = role === 'host' ? coop.ally : game.player;
    if (!downed || downed.downed) return false;
    downed.hp = 0;
    downed.downed = true;
    downed.vx = 0;
    downed.vy = 0;
    downed.isDashing = false;
    downed.dash = 0;
    downed.invulnTimer = 0;
    downed.invuln = 0;
    downed.dashHitEnemies?.clear?.();
    if (role === 'guest') {
      downed.input = { dx: 0, dy: 0, aim: downed.aimAngle || 0, dash: false };
      downed.lastInputAt = 0;
    } else {
      game.releaseJoystickTouch?.();
    }
    const run = coop.rescue || (coop.rescue = newRun());
    run.deaths++;
    const duration = Math.min(MAX_SECONDS, BASE_SECONDS + (run.deaths - 1) * EXTRA_SECONDS);
    downed.reviveIn = duration;
    downed.reviveDuration = duration;
    run.lastStand = {
      role, duration, remaining: duration, nearSeconds: 0, assistance: false
    };
    game.texts?.push?.({
      x: downed.x, y: downed.y - 55,
      text: `战机失能 · 坚持 ${duration} 秒救援！`,
      color: '#ff8b97', size: 17, life: 2, maxLife: 2
    });
    if (!alive(other)) {
      run.lastStand = null;
      game.gameOver();
    }
    return true;
  }
  function tick(game, dt) {
    if (!active(game) || game.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const run = game.lanCoop.rescue;
    const stand = run?.lastStand;
    if (!stand) return;
    const downed = stand.role === 'host' ? game.player : game.lanCoop.ally;
    const rescuer = stand.role === 'host' ? game.lanCoop.ally : game.player;
    if (!downed?.downed) {
      run.lastStand = null;
      return;
    }
    if (!alive(rescuer)) {
      run.lastStand = null;
      game.gameOver();
      return;
    }
    const close = Math.hypot(rescuer.x - downed.x, rescuer.y - downed.y) <= NEAR_DISTANCE;
    stand.nearSeconds = close ? stand.nearSeconds + dt : 0;
    stand.assistance = stand.nearSeconds >= NEAR_PREPARE;
    const step = dt * (stand.assistance ? NEAR_MULTIPLIER : 1);
    stand.remaining = Math.max(0, stand.remaining - step);
    downed.reviveIn = stand.remaining;
    run.totalHoldSeconds += dt;
    if (stand.remaining > 0) return;
    // Revive next to the surviving ally, not in the middle of the enemy pile.
    downed.x = rescuer.x + 60;
    downed.y = rescuer.y;
    downed.hp = Math.max(1, Math.ceil(downed.maxHp * .4));
    downed.downed = false;
    downed.invuln = 2;
    downed.invulnTimer = 2;
    downed.reviveIn = 0;
    downed.reviveDuration = 0;
    downed.vx = 0;
    downed.vy = 0;
    downed.dash = 0;
    run.lastStand = null;
    game.texts?.push?.({
      x: downed.x, y: downed.y - 42,
      text: '协同救援成功 · 40%生命 / 2秒无敌',
      color: '#8fffe2', size: 17, life: 1.5, maxLife: 1.5
    });
  }
  function overlay(ctx, game, state) {
    const rescue = state?.rescue;
    if (!rescue?.deaths) return;
    const localRole = game.lanCoop?.guestMode
      ? (game.lanCoop?.rtc?.localPlayerId || 'guest') : 'host';
    const ownDown = rescue.fallen === localRole;
    const width = game.width || 360;
    if (!rescue.fallen || !rescue.remaining) {
      // Persistent in-run global counter, shared by host and guest.
      ctx.save();
      ctx.setTransform(game.dpr || 1, 0, 0, game.dpr || 1, 0, 0);
      ctx.fillStyle = 'rgba(7,17,35,.74)';
      ctx.fillRect(12, 112, Math.min(width - 24, 330), 27);
      ctx.fillStyle = '#afdded';
      ctx.font = '12px system-ui';
      const next = Math.min(MAX_SECONDS, BASE_SECONDS + rescue.deaths * EXTRA_SECONDS);
      ctx.fillText(`累计倒地 ${rescue.deaths} 次 · 已坚持 ${Math.floor(rescue.totalHoldSeconds)} 秒 · 下次 ${next} 秒`,
        19, 130, Math.max(80, Math.min(width - 40, 315)));
      ctx.restore();
      return;
    }
    const y = Math.min((game.height || 700) - 112, 144);
    const boxWidth = Math.min(width - 24, 385);
    const x = (width - boxWidth) / 2;
    ctx.save();
    ctx.setTransform(game.dpr || 1, 0, 0, game.dpr || 1, 0, 0);
    ctx.fillStyle = 'rgba(7, 17, 35, .89)';
    ctx.fillRect(x, y, boxWidth, 94);
    ctx.strokeStyle = ownDown ? '#ff778d' : '#8cffda';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxWidth, 94);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5fbff';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(ownDown ? '战机倒地 · 等待队友坚持' : '队友倒地 · 坚持到救援完成',
      width / 2, y + 25);
    ctx.fillStyle = '#8effdb';
    ctx.font = 'bold 19px system-ui';
    ctx.fillText(`${rescue.remaining} 秒 · 累计倒地 ${rescue.deaths} 次`,
      width / 2, y + 55);
    ctx.fillStyle = '#a5bed0';
    ctx.font = '12px system-ui';
    ctx.fillText(rescue.assistance ? '近距离救援加速中（×2）' :
      `本轮坚持 ${rescue.duration} 秒 · 累计已坚持 ${Math.floor(rescue.totalHoldSeconds)} 秒`,
    width / 2, y + 77);
    ctx.restore();
  }
  window.NeonLanRevive = Object.freeze({
    BASE_SECONDS, EXTRA_SECONDS, MAX_SECONDS, newRun,
    active, knockDown, tick, summary, overlay
  });
})();
