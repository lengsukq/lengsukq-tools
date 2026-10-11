/* Host-only cooperative survival for three and four pilots. The original
 * two-player rescue rules remain untouched for legacy rooms. */
(() => {
  'use strict';
  const living = p => p && p.hp > 0 && !p.downed && !p.disconnected;
  function tick(game, guests, dt) {
    if (game?.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const all = [game.player, ...guests].filter(p => p && !p.disconnected);
    const run = game.lanCoop.multiRescue ||= { deaths: 0, totalHoldSeconds: 0 };
    for (const pilot of all) {
      if (pilot.hp > 0 || pilot.downed) continue;
      run.deaths++;
      const duration = Math.min(40, 8 + (run.deaths - 1) * 4);
      pilot.hp = 0;
      pilot.downed = true;
      pilot.reviveIn = duration;
      pilot.reviveDuration = duration;
      pilot.reviveNearSeconds = 0;
      pilot.input = {dx: 0, dy: 0, dash: false};
    }
    const survivors = all.filter(living);
    if (!survivors.length && all.length) { game.gameOver?.(); return; }
    for (const pilot of all) {
      if (!pilot.downed) continue;
      const nearest = survivors.reduce((best, candidate) => {
        const dist = Math.hypot(candidate.x - pilot.x, candidate.y - pilot.y);
        return dist < best.distance ? {candidate,distance:dist} : best;
      }, {candidate:null,distance:Infinity});
      const isNear = nearest.distance <= 145;
      pilot.reviveNearSeconds = isNear ? (pilot.reviveNearSeconds || 0) + dt : 0;
      const elapsed = dt * (pilot.reviveNearSeconds >= 3 ? 2 : 1);
      pilot.reviveIn = Math.max(0, (pilot.reviveIn || 0) - elapsed);
      run.totalHoldSeconds += dt;
      if (pilot.reviveIn > 0) continue;
      const anchor = nearest.candidate || survivors[0];
      if (!anchor) continue;
      pilot.x = anchor.x + 60;
      pilot.y = anchor.y;
      pilot.hp = Math.max(1, Math.ceil(pilot.maxHp * .4));
      pilot.downed = false;
      pilot.reviveIn = 0;
      pilot.reviveDuration = 0;
      pilot.invuln = 2;
      pilot.invulnTimer = 2;
      pilot.reviveNearSeconds = 0;
    }
  }
  function summary(game) {
    const run = game?.lanCoop?.multiRescue;
    const all = [game?.player, ...((game?.lanCoop?.allies?.values?.() || []))];
    const fallen = all.filter(p => p?.downed);
    const closest = fallen.reduce((a,b) => !a || (b.reviveIn || Infinity) < (a.reviveIn || Infinity)
      ? b : a, null);
    return { deaths: run?.deaths || 0,
      totalHoldSeconds: Math.round((run?.totalHoldSeconds || 0) * 10) / 10,
      fallen: closest?.id || null,
      duration: closest?.reviveDuration || 0,
      remaining: Math.ceil(closest?.reviveIn || 0),
      assistance: Boolean(closest?.reviveNearSeconds >= 3),
      fallenIds: fallen.map(p => p.id || 'host'),
      downedCount: fallen.length };
  }
  window.NeonLanMultiRules = Object.freeze({ tick, summary });
})();
