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
  /** Populate the guest view in place.
   *
   *  Every replicated field is written by the SHARED contract, so a field the
   *  host sends can no longer be silently ignored here: this function used to
   *  be 60 hand-written assignments, which is how the warp ribbon, the aegis
   *  flags and the real slash damage never reached a guest.
   */
  function updateView(view, state, game, coop) {
    const schema = window.NeonLanSchema;
    const xp = state.teamXP || { xp: 0, xpNeeded: 1, level: state.level || 1 };
    view.isGuestWorldView = true;
    const focus = state.guest.downed && state.host.hp > 0 ? state.host : state.guest;
    view.camera ||= { x: 0, y: 0 };
    view.camera.x = focus.x;
    view.camera.y = focus.y;

    const player = view.player ||= {};
    schema.applyPilot(player, state.guest, { scope: 'remote' });
    // The ship projection travels under its runtime name, so these are verbatim.
    player.phantomVisual = state.guest.phantom?.visual || [];
    player.astraVisual = state.guest.astra?.visual || [];
    player.starWeave = state.guest.astra ? { anchors: state.guest.astra.anchors || [] } : null;
    player.visualDash = state.guest.visualDash || 0;
    player.xp = xp.xp;
    player.xpNeeded = xp.xpNeeded;
    player.level = xp.level;

    for (const name of schema.ARRAY_NAMES) schema.applyEntities(view, state, name);
    view.currentBoss = (state.enemies || []).find(enemy => enemy.isBoss) || null;
    view.survivalTime = state.time || 0;
    view.kills = state.kills || 0;
    view.difficulty = state.difficulty || 0;
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
