/* A snapshot-backed READ-ONLY view of the host's world.
 *
 * The guest calls the exact same NeonSurvivorGame.render() / renderFighter() as
 * the host. Object.create(game) shares methods/DOM/Canvas without mutating
 * authoritative simulation state or running update/spawning/weapon logic.
 */
(() => {
  'use strict';
  const arrays = Object.freeze([
    'enemies', 'bullets', 'enemyBullets', 'gems', 'particles', 'texts',
    'shockwaves', 'laserBeams', 'companionDrones', 'blackHoles', 'mines',
    'lightningTethers', 'orbiters', 'dashTrails'
  ]);
  const lerp = (a, b, t) => a + (b - a) * t;
  const moving = (current, previous, t) => {
    if (!current) return current;
    if (!previous) return current;
    return {
      ...current,
      x: Number.isFinite(previous.x) && Number.isFinite(current.x)
        ? lerp(previous.x, current.x, t) : current.x,
      y: Number.isFinite(previous.y) && Number.isFinite(current.y)
        ? lerp(previous.y, current.y, t) : current.y
    };
  };
  function blendArray(current = [], previous = [], progress = 1) {
    if (progress >= 1 || !previous?.length) return current;
    const previousById = new Map(previous.map(item => [item.id, item]));
    return current.map(item => moving(item, previousById.get(item.id), progress));
  }
  function interpolate(current, previous, progress = 1) {
    const t = Math.min(1, Math.max(0, progress));
    if (!previous || t >= 1) return current;
    const result = {
      ...current,
      host: moving(current.host, previous.host, t),
      guest: moving(current.guest, previous.guest, t)
    };
    for (const field of arrays) {
      if (field === 'orbiters') continue; // angles rotate; no position to interpolate
      result[field] = blendArray(current[field], previous[field], t);
    }
    return result;
  }
  function create(game, state, coop) {
    const view = Object.create(game);
    const xp = state.teamXP || { xp: 0, xpNeeded: 1, level: state.level || 1 };
    view.isGuestWorldView = true;
    // Render relative to the guest, never the host's local camera.
    const focus = state.guest.downed && state.host.hp > 0 ? state.host : state.guest;
    view.camera = { x: focus.x, y: focus.y };
    view.player = {
      x: state.guest.x, y: state.guest.y,
      hp: state.guest.hp, maxHp: state.guest.maxHp,
      aimAngle: state.guest.aimAngle || 0,
      radius: state.guest.radius || 16,
      invulnTimer: state.guest.invuln || 0,
      downed: Boolean(state.guest.downed),
      level: xp.level, xp: xp.xp, xpNeeded: xp.xpNeeded,
      regen: .8 + (state.guest.passives?.armor || 0) * 1.8,
      crystals: state.host.crystals || 0,
      maxDashCharges: state.guest.maxCharges || 3, dashCharges: state.guest.charges ?? 3,
      dashRechargeTime: 2.2, dashRechargeTimer: state.guest.recharge || 0,
      cdrMultiplier: state.guest.cdrMultiplier || 1,
      dmgMultiplier: state.guest.dmgMultiplier || 1, areaMultiplier: state.guest.areaMultiplier || 1,
      dashSlashDmg: 95, dashCombo: 0,
      aegisTimer: 0, aegisDuration: 0, hasAegis: false,
      weapons: state.guest.weapons || { blaster: 1 },
      passives: state.guest.passives || {}, dashUpgrades: state.guest.dashUpgrades || {},
      limitBreaks: {}
    };
    view.survivalTime = state.time || 0;
    view.kills = state.kills || 0;
    view.difficulty = state.difficulty || 0;
    view.currentBoss = (state.enemies || []).find(enemy => enemy.isBoss) || null;
    for (const field of arrays) view[field] = state[field] || [];
    // Only the host computes entities. Remote renderer is visual-only.
    view.lanCoop = coop;
    view.screenShake = 0;
    view.screenShakeAngle = 0;
    return view;
  }
  window.NeonLanWorldView = Object.freeze({ arrays, interpolate, create });
})();
