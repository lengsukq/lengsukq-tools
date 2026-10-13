/* ASTRA / 星织: independent, capped spell arsenal and passive modifiers.
 * Each attack is executed only in the authoritative combat world. Draw/render
 * and UI state may consume snapshots without re-running hit detection.
 */
(() => {
  'use strict';
  const WEAPONS = Object.freeze({
    star_fragments: { period: 2.4, min: 1.35 },
    prism_split: { period: 2.2, min: 1.1 },
    chrono_bind: { period: 3.0, min: 1.65 },
    eclipse_seal: { period: 4.4, min: 2.5 },
    returning_orb: { period: 2.6, min: 1.5 },
    void_shock: { period: 3.1, min: 1.7 },
    sky_meteor: { period: 6.7, min: 4.1 },
    singularity_chant: { period: 7.8, min: 4.7 }
  });
  const MAX_EVENTS = 16;
  const MAX_TARGETS = 16;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rank = (p, id) => clamp(Math.floor(p?.passives?.[id] || 0), 0, 5);
  const weaponRank = (p, id) => clamp(Math.floor(p?.weapons?.[id] || 0), 0, 5);
  const safe = p => p?.shipId === 'astra' && p.hp > 0 && !p.downed;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const active = enemy => enemy && !enemy.dead && enemy.hp > 0;
  const fx = (pilot,kind,from,to,radius,life) =>
    window.NeonAstraVisual?.emit(pilot,kind,from,to,radius,life);

  function modifiers(pilot) {
    const talisman = rank(pilot, 'star_talisman');
    const conduit = rank(pilot, 'ley_conduit');
    const focus = rank(pilot, 'weave_focus');
    const mark = rank(pilot, 'star_mark_hunt');
    const extent = rank(pilot, 'glyph_extent');
    const danger = rank(pilot, 'danger_resonance');
    const low = pilot?.hp <= (pilot?.maxHp || 95) * .4;
    return {
      maxMana: 100 + talisman * 20,
      manaRegen: 2 + conduit * 1.0,
      cooldownFactor: clamp(1 - focus * .07, .65, 1),
      areaFactor: 1 + extent * .12,
      markBonus: 1 + mark * .10,
      dangerBonus: low ? 1 + danger * .10 : 1,
      shieldReduction: low ? danger * .03 : 0,
      refraction: rank(pilot, 'shield_refraction'),
      resonance: rank(pilot, 'astral_resonance')
    };
  }

  function state(pilot) {
    if (!pilot || pilot.shipId !== 'astra') return null;
    return pilot.astraArsenal ||= {
      timers: {}, pending: [], marks: new Map(),
      lastRefractionAt: -Infinity
    };
  }
  function targets(game, pilot, max = 70) {
    const result = [];
    for (const e of game.enemies || []) {
      if (active(e) && distance(e, pilot) < 950) result.push(e);
      if (result.length >= max) break;
    }
    return result;
  }
  function nearest(enemies, point, range = 800, exclude = null) {
    let chosen = null, closest = range;
    for (const e of enemies) {
      if (e === exclude || !active(e)) continue;
      const d = distance(e, point);
      if (d < closest) { chosen = e; closest = d; }
    }
    return chosen;
  }
  function markEnemy(pilot, enemy, until) {
    if (!safe(pilot) || !active(enemy)) return;
    const s = state(pilot);
    if (s.marks.size >= 48 && !s.marks.has(enemy)) {
      s.marks.delete(s.marks.keys().next().value);
    }
    s.marks.set(enemy, until);
    fx(pilot,'mark',enemy,null,24,.32);
  }
  function hit(pilot, game, enemy, base, source, mana = true) {
    if (!active(enemy) || !safe(pilot)) return false;
    const s = state(pilot);
    const m = modifiers(pilot);
    const bonus = (s.marks.get(enemy) || 0) > (game.survivalTime || 0)
      ? m.markBonus : 1;
    const echo = s.mirrorEchoPending
      ? 1 + Math.min(2, pilot.dashUpgrades?.mirror_echo || 1) * .15 : 1;
    if (s.mirrorEchoPending) s.mirrorEchoPending = false;
    const scale = window.NeonAstra?.attackScale?.(pilot) || (pilot.dmgMultiplier || 1);
    const damage = base * scale * m.dangerBonus * bonus * echo;
    if (echo > 1) fx(pilot,'echo',pilot,enemy,38,.32);
    game.dealDamage(enemy, damage, source, false, pilot);
    if (mana) window.NeonAstra?.regenOnHit(pilot, enemy, game.survivalTime || 0);
    return true;
  }
  function pulse(pilot, game, enemies, origin, radius, amount, source, limit = 8) {
    let count = 0;
    for (const e of enemies) {
      if (!active(e) || distance(e, origin) > radius + (e.radius || 12)) continue;
      hit(pilot, game, e, amount, source);
      if (++count >= Math.min(MAX_TARGETS, limit)) break;
    }
    return count;
  }
  function schedule(pilot, item) {
    const s = state(pilot);
    if (s.pending.length >= MAX_EVENTS) s.pending.shift();
    s.pending.push(item);
  }

  function fire(pilot, game, id, level, list) {
    const s = state(pilot);
    const mods = modifiers(pilot);
    const focus = nearest(list, pilot);
    if (!focus) return false;
    const radius = mods.areaFactor;
    const now = game.survivalTime || 0;
    switch (id) {
      case 'star_fragments': // Delayed skyfall locks the enemy's old position.
        markEnemy(pilot, focus, now + 3);
        fx(pilot,'telegraph',focus,null,(60+level*10)*radius,.5);
        schedule(pilot, { kind: 'burst', delay: .5,
          x: focus.x, y: focus.y, radius: (60 + level * 10) * radius,
          damage: 38 + level * 18, source: 'astra_fragments', targets: 10 });
        break;
      case 'prism_split': { // Limited, non-recursive chaining between targets.
        let e = focus;
        const seen = new Set();
        for (let i = 0; i < Math.min(8, 2 + level); i++) {
          if (!e || seen.has(e)) break;
          seen.add(e);
          hit(pilot, game, e, 32 + level * 13, 'astra_prism');
          const next = nearest(list.filter(other => !seen.has(other)), e, 150 + level * 12);
          fx(pilot,'chain',seen.size===1?pilot:e,next||e,55,.3);
          e=next;
        }
        break;
      }
      case 'chrono_bind': { // Slow several linked enemies, bosses less.
        let n = 0;
        for (const e of list) {
          if (distance(e, focus) > (115 + level * 10) * radius) continue;
          hit(pilot, game, e, 22 + level * 9, 'astra_chrono');
          e.freezeTimer = Math.max(e.freezeTimer || 0, e.isBoss ? .18 : .45 + level * .12);
          fx(pilot,'shield',e,null,32,.42);
          if (++n >= 3 + level) break;
        }
        break;
      }
      case 'eclipse_seal': // Visible delayed seal; high positional payout.
        fx(pilot,'telegraph',focus,null,(100+level*10)*radius,1);
        schedule(pilot, { kind: 'burst', delay: 1,
          x: focus.x, y: focus.y, radius: (100 + level * 10) * radius,
          damage: 60 + level * 25, source: 'astra_eclipse', targets: 12 });
        break;
      case 'returning_orb': { // Distinct outgoing and returning lanes.
        const dx = focus.x - pilot.x, dy = focus.y - pilot.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const x = pilot.x + dx / d * Math.min(d, 260 + level * 16);
        const y = pilot.y + dy / d * Math.min(d, 260 + level * 16);
        schedule(pilot, { kind: 'orb', delay: .25, x, y,
          radius: (34 + level * 5) * radius,
          damage: 24 + level * 12, source: 'astra_orb_out', targets: 8 });
        schedule(pilot, { kind: 'orb', delay: .75, x: pilot.x, y: pilot.y,
          radius: (70 + level * 8) * radius,
          damage: 30 + level * 14, source: 'astra_orb_return', targets: 8 });
        fx(pilot,'orb',pilot,{x,y},40,.45);
        break;
      }
      case 'void_shock': { // A directional cone, not a generic radius blast.
        const angle = Math.atan2(focus.y - pilot.y, focus.x - pilot.x);
        fx(pilot,'beam',pilot,focus,70,.28);
        let n = 0;
        for (const e of list) {
          if (distance(e, pilot) > (250 + level * 16) * radius) continue;
          const delta = Math.atan2(Math.sin(Math.atan2(e.y - pilot.y, e.x - pilot.x) - angle),
            Math.cos(Math.atan2(e.y - pilot.y, e.x - pilot.x) - angle));
          if (Math.abs(delta) > .48 + level * .035) continue;
          hit(pilot, game, e, 35 + level * 16, 'astra_shock');
          if (++n >= 6 + level) break;
        }
        break;
      }
      case 'sky_meteor': // Separate, staggered impact zones.
        for (let i = 0; i < Math.min(5, 2 + level); i++) {
          const a = i * 2.3999632 + now * .15;
          schedule(pilot, { kind: 'burst', delay: .4 + .3 * i,
            x: focus.x + Math.cos(a) * 72, y: focus.y + Math.sin(a) * 72,
            radius: (70 + level * 6) * radius,
            damage: 52 + level * 18, source: 'astra_skyfall', targets: 9 });
          fx(pilot,'telegraph',{
            x:focus.x+Math.cos(a)*72,y:focus.y+Math.sin(a)*72
          },null,(70+level*6)*radius,.4+.3*i);
        }
        break;
      case 'singularity_chant': // Long charge & one heavily capped detonation.
        fx(pilot,'telegraph',focus,null,(135+level*12)*radius,1.4);
        schedule(pilot, { kind: 'burst', delay: 1.4,
          x: focus.x, y: focus.y, radius: (135 + level * 12) * radius,
          damage: 110 + level * 38, source: 'astra_singularity', targets: 16 });
        break;
      default: return false;
    }
    return true;
  }
  function tick(pilot, game, dt) {
    if (!safe(pilot) || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return 0;
    const s = state(pilot);
    const mods = modifiers(pilot);
    const list = targets(game, pilot);
    let fired = 0;
    for (const [id, rule] of Object.entries(WEAPONS)) {
      const level = weaponRank(pilot, id);
      if (!level) continue;
      const interval = Math.max(rule.min, rule.period * (1 - (level - 1) * .09) *
        (pilot.cdrMultiplier || 1) * mods.cooldownFactor);
      s.timers[id] = Math.min(interval, (s.timers[id] || 0) + dt);
      if (s.timers[id] < interval) continue;
      if (fire(pilot, game, id, level, list)) {
        s.timers[id] = 0;
        fired++;
      }
    }
    // Resolve queued delayed events after the weapon loop. A long stalled
    // frame never spawns an unbounded cascade and no event self-schedules.
    for (let i = s.pending.length - 1; i >= 0; i--) {
      const event = s.pending[i];
      event.delay -= dt;
      if (event.delay > 0) continue;
      s.pending.splice(i, 1);
      pulse(pilot, game, list, event, event.radius, event.damage,
        event.source, event.targets);
      fx(pilot,'burst',event,null,event.radius,.44);
      if ((game.shockwaves?.length || 0) < 35) game.shockwaves?.push({
        x: event.x, y: event.y, radius: 8, maxRadius: event.radius,
        color: '#b89bff', alpha: .7
      });
    }
    for (const [enemy, expires] of s.marks) {
      if (!active(enemy) || expires <= (game.survivalTime || 0)) s.marks.delete(enemy);
    }
    return fired;
  }

  function reflect(game, pilot, absorbed) {
    const s = state(pilot);
    const strength = modifiers(pilot).refraction;
    const now = game?.survivalTime || 0;
    if (!safe(pilot) || !strength || !(absorbed > 0) ||
        now - s.lastRefractionAt < 4 || game?.state !== 'playing') return false;
    const e = nearest(targets(game, pilot, 50), pilot, 200);
    if (!e) return false;
    s.lastRefractionAt = now;
    hit(pilot, game, e, Math.min(240, absorbed * .25 + strength * 14),
      'astra_refraction', false);
    fx(pilot,'beam',pilot,e,35,.3);
    return true;
  }

  function onBlink(pilot, game, now) {
    if (!safe(pilot) || game?.state !== 'playing') return false;
    const s = state(pilot);
    const up = pilot.dashUpgrades || {};
    const spell = window.NeonAstra?.state(pilot);
    if (up.prism_veil && spell) {
      spell.phaseVeilRemaining = Math.max(spell.phaseVeilRemaining || 0,
        1 + Math.min(2, up.prism_veil) * .6);
      fx(pilot,'shield',pilot,null,52,.45);
    }
    if (up.spatial_disturb) {
      const radius = 100 + Math.min(2, up.spatial_disturb) * 25;
      let n = 0;
      for (const e of targets(game, pilot)) {
        if (distance(e, pilot) > radius) continue;
        e.freezeTimer = Math.max(e.freezeTimer || 0, e.isBoss ? .15 : .55);
        if (++n >= 12) break;
      }
    }
    if (up.rift_brand && spell && spell.mana >= 15 &&
        now - (spell.lastBrandAt || -Infinity) >= 4) {
      spell.lastBrandAt = now;
      spell.mana -= 15;
      pulse(pilot, game, targets(game, pilot), pilot, 135,
        45 + Math.min(up.rift_brand, 2) * 28, 'astra_rift_brand', 8);
      fx(pilot,'burst',pilot,null,135,.38);
    }
    if (up.mirror_echo) {
      s.mirrorEchoPending = true;
      fx(pilot,'mark',pilot,null,34,.45);
    }
    if (up.anchor_rewrite && pilot.starWeave?.anchors?.length) {
      let nearestAnchor = null;
      let minDistance = 180 + Math.min(2, up.anchor_rewrite) * 30;
      for (const anchor of pilot.starWeave.anchors) {
        const d = distance(pilot, anchor);
        if (d < minDistance) { minDistance = d; nearestAnchor = anchor; }
      }
      if (nearestAnchor) {
        fx(pilot,'beam',nearestAnchor,pilot,24,.3);
        nearestAnchor.x = pilot.x;
        nearestAnchor.y = pilot.y;
        // Preserve remaining lifetime, so phase spam cannot extend star nets.
      }
    }
    return true;
  }

  function upgrade(pilot, card) {
    if (!safe(pilot) || !card || card.shipId !== 'astra') return false;
    const catalog = window.NeonAstra?.catalog || [];
    const def = catalog.find(item => item.id === card.id);
    if (!def || def.type !== card.type) return false;
    const bag = def.type === 'weapon' ? (pilot.weapons ||= {}) :
      def.type === 'passive' ? (pilot.passives ||= {}) : (pilot.dashUpgrades ||= {});
    const old = bag[card.id] || 0;
    if (old >= def.maxLvl) return false;
    bag[card.id] = old + 1;
    if (def.type === 'dash') {
      const astra = window.NeonAstra?.state(pilot);
      if (astra) astra.warpUpgrades[card.id] = bag[card.id];
    }
    if (card.id === 'star_talisman') {
      const astra = window.NeonAstra?.state(pilot);
      if (astra) astra.maxMana = modifiers(pilot).maxMana;
    }
    return true;
  }

  // All 24 distinct cards share the same authoritative ship hook.
  if (window.NeonShips?.registerUpgradeCatalog && window.NeonAstra?.catalog) {
    window.NeonShips.registerUpgradeCatalog('astra', window.NeonAstra.catalog);
    window.NeonShips.registerAbilities('astra', {
      onStart(pilot) { state(pilot); window.NeonAstra?.state(pilot); },
      onTick(pilot, game, dt) {
        window.NeonAstraVisual?.tick(pilot,dt);
        window.NeonAstra?.tick(pilot, game, dt);
        window.NeonAstraWeave?.tick(pilot, game, dt);
        tick(pilot, game, dt);
      },
      onAction(pilot, game, action) {
        if (action === 'meteor' || action === 'ward') return window.NeonAstra?.cast(pilot, game, action);
        if (action?.kind === 'warp' || action?.kind === 'blink') return window.NeonAstra?.blink(pilot, game,
          action.direction, game.survivalTime || 0);
        return false;
      },
      onUpgrade(pilot, game, card) { return upgrade(pilot, card); }
    });
  }
  window.NeonAstraArsenal = Object.freeze({
    WEAPONS, MAX_EVENTS, MAX_TARGETS, state, modifiers, upgrade, tick,
    fire, hit, pulse, markEnemy, reflect, onBlink
  });
})();
