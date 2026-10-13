/* Neon Survivor V3: build-dependent fusion rewards. No extra equipment slots. */
(() => {
  'use strict';
  const recipes = Object.freeze([
    { id: 'storm_lance', name: '电弧裁决', rarity: 'legendary', requires: ['tesla', 'laser'],
      desc: '闪电与激光命中后弹射额外电弧，最多两名附近敌人。' },
    { id: 'singularity_swarm', name: '奇点蜂群', rarity: 'legendary', requires: ['missiles', 'blackhole'],
      desc: '飞弹击破敌人后引发范围牵引爆震。' },
    { id: 'thermal_shock', name: '热寂反应', rarity: 'legendary', requires: ['cryomine', 'dash_fire'],
      desc: '等离子火墙命中冻结目标时触发大范围热冲击。' },
    { id: 'phase_blade_dance', name: '时空刃舞', rarity: 'legendary', requires: ['orbit', 'dash_charge'],
      desc: '精准折跃穿透时，激发相位刃追斩附近敌群。' },
    { id: 'gravity_reversal', name: '引力反转', rarity: 'legendary', requires: ['nova', 'blackhole'],
      desc: '超新星爆发前拉拢敌人，冲击伤害强化并扩散减速。' },
    { id: 'celestial_tempest', name: '天界风暴', rarity: 'legendary', requires: ['star_weave', 'tesla'],
      desc: '星梭连线触发连锁雷暴，星网坍缩时引发大范围电浆轰击。' },
    { id: 'soul_devourer', name: '噬魂黑洞', rarity: 'legendary', requires: ['phantom_scythe', 'blackhole'],
      desc: '黑洞吸引死印目标时产生暗影殉爆，造成大量湮灭伤害。' }
  ]);
  const map = new Map(recipes.map(r => [r.id, r]));
  const owns = (game, id) => Boolean(game.endlessState?.fusions?.includes(id));
  const level = (game, id) => {
    const p = game.player;
    if (id === 'dash_fire') {
      return (p.dashUpgrades?.dash_fire || 0) ||
        (p.astra?.warpUpgrades?.star_gate || 0) ||
        (p.phantom?.warpUpgrades?.void_step || 0) ||
        Object.values(p.dashUpgrades || p.astra?.warpUpgrades || p.phantom?.warpUpgrades || {}).reduce((a, b) => a + (b || 0), 0);
    }
    if (id === 'dash_charge') {
      return (p.dashUpgrades?.dash_charge || 0) ||
        (p.astra?.warpUpgrades?.phase_shift || 0) ||
        (p.phantom?.warpUpgrades?.charge_overflow || 0) ||
        Object.values(p.dashUpgrades || p.astra?.warpUpgrades || p.phantom?.warpUpgrades || {}).reduce((a, b) => a + (b || 0), 0);
    }
    if (id.startsWith('dash_')) return p.dashUpgrades?.[id] || 0;
    return (p.weapons?.[id] || 0) || (p.passives?.[id] || 0);
  };

  function available(game) {
    if (!game.endlessMode) return [];
    return recipes.filter(r => !owns(game, r.id)
      && r.requires.every(id => level(game, id) >= (id.startsWith('dash_') ? 2 : 3)));
  }
  function acquire(game, id) {
    if (!map.has(id) || !available(game).some(r => r.id === id)) return false;
    game.endlessState.fusions.push(id);
    return true;
  }
  function modifyDamage(game, target, damage, source) {
    if (!game.endlessMode) return damage;
    let mult = 1;
    if (owns(game, 'storm_lance') && (source === 'laser' || source === 'tesla')) mult *= 1.15;
    if (owns(game, 'singularity_swarm') && source === 'missile') mult *= 1.22;
    if (owns(game, 'gravity_reversal') && source === 'nova') mult *= 1.20;
    if (owns(game, 'celestial_tempest') && (source === 'tesla' || source.startsWith('astra_'))) mult *= 1.20;
    if (owns(game, 'soul_devourer') && (source === 'blackhole' || source.startsWith('phantom_'))) mult *= 1.20;
    return damage * mult;
  }
  function onDamage(game, target, finalDamage, source) {
    if (!game.endlessMode || !game.endlessState || source === 'fusion' || source === 'nuke' || target.dead) return;
    const st = game.endlessState;
    if (owns(game, 'storm_lance') && (source === 'laser' || source === 'tesla')) {
      if (game.survivalTime < (st.arcReadyAt || 0)) return;
      st.arcReadyAt = game.survivalTime + 0.28;
      let count = 0;
      for (const enemy of game.enemies) {
        if (enemy === target || enemy.dead) continue;
        if (Math.hypot(enemy.x - target.x, enemy.y - target.y) > 165) continue;
        game.dealDamage(enemy, Math.min(160, finalDamage * 0.45), 'fusion');
        if (++count >= 2) break;
      }
    } else if (owns(game, 'thermal_shock') && source === 'fire' && (target.freezeTimer || 0) > 0) {
      if (game.survivalTime < (st.thermalReadyAt || 0)) return;
      st.thermalReadyAt = game.survivalTime + 0.70;
      target.freezeTimer = 0;
      burst(game, target, 115, 125, '#ff8855');
    } else if (owns(game, 'celestial_tempest') && (source.startsWith('astra_') || source === 'tesla')) {
      if (game.survivalTime < (st.tempestReadyAt || 0)) return;
      st.tempestReadyAt = game.survivalTime + 0.45;
      burst(game, target, 120, 95, '#00f3ff');
    } else if (owns(game, 'soul_devourer') && (source.startsWith('phantom_') || source === 'blackhole')) {
      if (game.survivalTime < (st.devourReadyAt || 0)) return;
      st.devourReadyAt = game.survivalTime + 0.55;
      burst(game, target, 135, 110, '#a855f7');
    }
  }
  function burst(game, target, radius, damage, color) {
    game.shockwaves.push({ x: target.x, y: target.y, radius: 8, maxRadius: radius, alpha: 0.95, color });
    let hits = 0;
    for (const enemy of game.enemies) {
      if (enemy.dead || enemy === target) continue;
      if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= radius) {
        game.dealDamage(enemy, damage * game.player.dmgMultiplier, 'fusion');
        if (++hits >= 12) break;
      }
    }
  }
  function onKill(game, enemy, source) {
    if (!game.endlessMode || source !== 'missile' || !owns(game, 'singularity_swarm')) return;
    const st = game.endlessState;
    if (game.survivalTime < (st.swarmReadyAt || 0)) return;
    st.swarmReadyAt = game.survivalTime + 0.65;
    burst(game, enemy, 130, 130, '#bb66ff');
  }
  function onPreciseDash(game, target) {
    if (!game.endlessMode || !owns(game, 'phase_blade_dance')) return;
    burst(game, target, 140, 135, '#77bbff');
  }
  function onNova(game) {
    if (!game.endlessMode || !owns(game, 'gravity_reversal')) return;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = game.player.x - enemy.x;
      const dy = game.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 20 && dist < 340) {
        enemy.x += dx / dist * Math.min(55, dist * 0.2);
        enemy.y += dy / dist * Math.min(55, dist * 0.2);
        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 0.65);
      }
    }
  }
  window.NeonRogueFusions = Object.freeze({ recipes, available, acquire, owns, modifyDamage, onDamage, onKill, onPreciseDash, onNova });
})();
