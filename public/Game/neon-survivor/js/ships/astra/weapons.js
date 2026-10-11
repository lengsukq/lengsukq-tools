/* ASTRA signature weapon: anchored spell links, independent of old drones.
 * The host alone calls tick(). Client rendering consumes bounded anchor state.
 * This module is safe to load while ASTRA is locked for live selection.
 */
(() => {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const MAX_TARGETS = 8;
  const FIRE_RANGE = 650;
  const LINK_INTERVAL = .5;
  const BURST_COOLDOWN = 6;

  function createState() {
    return { anchors: [], fireElapsed: 0, linkElapsed: 0,
      nextBurstAt: 0, serial: 0 };
  }
  function state(pilot) {
    if (!pilot || pilot.shipId !== 'astra') return null;
    return pilot.starWeave ||= createState();
  }
  function closest(enemies, pilot) {
    let best = null;
    let bestSquare = FIRE_RANGE * FIRE_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestSquare) { best = e; bestSquare = d2; }
    }
    return best;
  }
  function segmentDistanceSq(x, y, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq < 1) return Infinity;
    const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1);
    const ex = x - a.x - t * dx, ey = y - a.y - t * dy;
    return ex * ex + ey * ey;
  }
  function linkedPairs(anchors) {
    const pairs = [];
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        pairs.push([anchors[i], anchors[j]]);
        if (pairs.length >= 3) return pairs;
      }
    }
    return pairs;
  }
  function applyDamage(game, pilot, enemy, amount, source, energy = false) {
    game.dealDamage(enemy, amount * (pilot.dmgMultiplier || 1), source, false, pilot);
    if (energy) window.NeonAstra?.regenOnHit(pilot, enemy, game.survivalTime || 0);
  }
  function tick(pilot, game, dt) {
    const level = clamp(Math.floor(pilot?.weapons?.star_weave || 0), 0, 5);
    if (pilot?.shipId !== 'astra' || level < 1 || pilot.hp <= 0 ||
        pilot.downed || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return;
    const s = state(pilot);
    const enemies = game.enemies || [];
    for (let i = s.anchors.length - 1; i >= 0; i--) {
      s.anchors[i].life -= dt;
      if (s.anchors[i].life <= 0) s.anchors.splice(i, 1);
    }
    const interval = Math.max(.28, (level >= 2 ? .52 : .65) *
      (pilot.cdrMultiplier || 1));
    s.fireElapsed += dt;
    if (s.fireElapsed >= interval) {
      s.fireElapsed = Math.min(s.fireElapsed - interval, interval);
      const target = closest(enemies, pilot);
      if (target) {
        applyDamage(game, pilot, target, 28, 'astra_weave_bolt', true);
        const angle = s.serial++ * 2.3999632;
        const newAnchor = { x: target.x + Math.cos(angle) * 25,
          y: target.y + Math.sin(angle) * 25, life: level >= 4 ? 5 : 4 };
        const maxAnchors = level >= 3 ? 3 : 2;
        if (s.anchors.length >= maxAnchors) s.anchors.shift();
        s.anchors.push(newAnchor);
      }
    }
    s.linkElapsed += dt;
    if (s.linkElapsed >= LINK_INTERVAL) {
      s.linkElapsed %= LINK_INTERVAL;
      const pairs = linkedPairs(s.anchors);
      const width = level >= 4 ? 16 : 11;
      const damage = 8 * (level >= 2 ? 1.25 : 1);
      let count = 0;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.hp <= 0) continue;
        const range = width + (enemy.radius || 12);
        if (!pairs.some(([a, b]) => segmentDistanceSq(enemy.x, enemy.y, a, b) <= range * range)) {
          continue;
        }
        applyDamage(game, pilot, enemy, damage, 'astra_weave_link', true);
        if (++count >= MAX_TARGETS) break;
      }
    }
    // A complete 3-node network triggers a bounded blast no more than once
    // every 6 seconds. Burst damage cannot grant mana or trigger itself.
    const now = game.survivalTime || 0;
    if (level >= 5 && s.anchors.length === 3 && now >= s.nextBurstAt) {
      s.nextBurstAt = now + BURST_COOLDOWN;
      const center = s.anchors.reduce((p, a) =>
        ({ x: p.x + a.x / 3, y: p.y + a.y / 3 }), { x: 0, y: 0 });
      let count = 0;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.hp <= 0 ||
            Math.hypot(enemy.x - center.x, enemy.y - center.y) > 108 + (enemy.radius || 12)) continue;
        applyDamage(game, pilot, enemy, 110, 'astra_weave_burst', false);
        if (++count >= 12) break;
      }
      if ((game.shockwaves?.length || 0) < 35) game.shockwaves?.push({
        x: center.x, y: center.y, radius: 16, maxRadius: 108,
        color: '#c18cff', alpha: .85
      });
    }
  }
  function render(ctx, pilot) {
    const s = pilot?.starWeave;
    if (!s?.anchors?.length) return;
    ctx.save();
    ctx.strokeStyle = '#a778ff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = .7;
    for (const [a, b] of linkedPairs(s.anchors)) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const anchor of s.anchors) {
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#d2afff'; ctx.fill();
    }
    ctx.restore();
  }
  window.NeonAstraWeave = Object.freeze({
    MAX_TARGETS, LINK_INTERVAL, BURST_COOLDOWN,
    createState, state, closest, segmentDistanceSq, linkedPairs, tick, render
  });
})();
