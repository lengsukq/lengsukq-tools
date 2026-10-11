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
  // Build entity-ID lookup and render objects ONCE per received snapshot.
  // The requestAnimationFrame path only edits x/y in stable objects, avoiding
  // fresh Maps, array copies and hundreds of short-lived objects at 60+ FPS.
  function createSampler(current, previous) {
    const scene = { ...current, host: { ...current.host }, guest: { ...current.guest } };
    const tracks = [];
    function track(target, latest, earlier) {
      if (!earlier || !Number.isFinite(latest.x) || !Number.isFinite(latest.y) ||
        !Number.isFinite(earlier.x) || !Number.isFinite(earlier.y)) return;
      tracks.push({ target, fromX: earlier.x, fromY: earlier.y,
        dx: latest.x - earlier.x, dy: latest.y - earlier.y });
    }
    track(scene.host, current.host, previous?.host);
    track(scene.guest, current.guest, previous?.guest);
    for (const field of arrays) {
      const values = current[field] || [];
      if (field === 'orbiters' || !previous?.[field]?.length) {
        scene[field] = values;
        continue;
      }
      const previousById = new Map(previous[field].map(item => [item.id, item]));
      scene[field] = values.map(item => {
        const older = previousById.get(item.id);
        if (!older || !Number.isFinite(older.x) || !Number.isFinite(older.y) ||
          !Number.isFinite(item.x) || !Number.isFinite(item.y)) return item;
        const target = { ...item };
        track(target, item, older);
        return target;
      });
    }
    return {
      scene,
      sample(progress = 1) {
        const t = Math.min(1, Math.max(0, progress));
        for (const item of tracks) {
          item.target.x = item.fromX + item.dx * t;
          item.target.y = item.fromY + item.dy * t;
        }
        return scene;
      }
    };
  }
  // Populate the same guest view in place rather than creating Object.create()
  // and a new player/camera object for every paint operation.
  function updateView(view, state, game, coop) {
    const xp = state.teamXP || { xp: 0, xpNeeded: 1, level: state.level || 1 };
    view.isGuestWorldView = true;
    const focus = state.guest.downed && state.host.hp > 0 ? state.host : state.guest;
    view.camera ||= { x: 0, y: 0 };
    view.camera.x = focus.x;
    view.camera.y = focus.y;
    const player = view.player ||= {};
    player.shipId = state.guest.shipId || 'riftblade';
    player.spectral = state.guest.spectral || null;
    player.phantom = player.shipId === 'phantom' && player.spectral ? {
      ectoplasm: player.spectral.ectoplasm,
      maxEctoplasm: player.spectral.maxEctoplasm,
      shiftActive: player.spectral.shiftActive,
      shiftRemaining: player.spectral.shiftRemaining,
      dashCharges: player.spectral.charges,
      dashRecharge: player.spectral.recharge,
      docked: player.spectral.docked,
      dockCooldownRemaining: player.spectral.dockCooldown
    } : null;
    if (player.shipId === 'astra' && state.guest.arcane) {
      const aura = state.guest.arcane;
      player.astra = {
        mana: aura.mana,
        maxMana: aura.maxMana,
        blinkCharges: aura.blinkCharges,
        blinkRecharge: aura.blinkRecharge,
        cooldowns: {
          meteor: aura.meteorCooldown,
          ward: aura.wardCooldown
        },
        wardRemaining: aura.wardRemaining,
        wardX: aura.wardX,
        wardY: aura.wardY,
        warpUpgrades: state.guest.dashUpgrades || {}
      };
      player.starWeave = { anchors: aura.anchors || [] };
    } else {
      player.astra = null;
      player.starWeave = null;
    }
    player.x = state.guest.x;
    player.y = state.guest.y;
    player.hp = state.guest.hp;
    player.maxHp = state.guest.maxHp;
    player.aimAngle = state.guest.aimAngle || 0;
    player.radius = state.guest.radius || 16;
    player.invulnTimer = state.guest.invuln || 0;
    player.downed = Boolean(state.guest.downed);
    player.level = xp.level;
    player.xp = xp.xp;
    player.xpNeeded = xp.xpNeeded;
    player.regen = .8 + (state.guest.passives?.armor || 0) * 1.8;
    player.crystals = state.host.crystals || 0;
    player.maxDashCharges = state.guest.maxCharges || 3;
    player.dashCharges = state.guest.charges ?? 3;
    player.dashRechargeTime = 2.2;
    player.dashRechargeTimer = state.guest.recharge || 0;
    player.cdrMultiplier = state.guest.cdrMultiplier || 1;
    player.dmgMultiplier = state.guest.dmgMultiplier || 1;
    player.areaMultiplier = state.guest.areaMultiplier || 1;
    player.dashSlashDmg = 95;
    player.dashCombo = 0;
    player.aegisTimer = 0;
    player.aegisDuration = 0;
    player.hasAegis = false;
    player.weapons = state.guest.weapons || { blaster: 1 };
    player.passives = state.guest.passives || {};
    player.dashUpgrades = state.guest.dashUpgrades || {};
    player.limitBreaks = player.limitBreaks || {};
    view.survivalTime = state.time || 0;
    view.kills = state.kills || 0;
    view.difficulty = state.difficulty || 0;
    view.currentBoss = (state.enemies || []).find(enemy => enemy.isBoss) || null;
    for (const field of arrays) view[field] = state[field] || [];
    view.lanCoop = coop;
    view.screenShake = 0;
    view.screenShakeAngle = 0;
    return view;
  }
  function create(game, state, coop) {
    const view = Object.create(game);
    // Force own copies: the authoritative game.player/camera must never be mutated.
    view.player = {};
    view.camera = {};
    return updateView(view, state, game, coop);
  }
  window.NeonLanWorldView = Object.freeze({
    arrays, interpolate, create, updateView, createSampler
  });
})();
