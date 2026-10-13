/* Neon Survivor V3: relic definitions and battle hooks (no dependencies on DOM). */
(() => {
  'use strict';
  const definitions = Object.freeze([
    { id: 'glass_reactor', name: '玻璃反应堆', rarity: 'rare', desc: '武器伤害 +35%，但最大生命值 -25%。' },
    { id: 'phase_hunter', name: '相位猎手', rarity: 'rare', desc: '精准折跃斩击伤害 +40%。' },
    { id: 'boss_hunter', name: '猎王协议', rarity: 'rare', desc: '对 Boss 伤害 +30%。' },
    { id: 'frost_core', name: '零度穿透', rarity: 'rare', desc: '攻击被冻结敌人时额外造成 28% 伤害。' },
    { id: 'ember_engine', name: '焚尽协议', rarity: 'common', desc: '等离子火墙伤害 +45%。' },
    { id: 'reaper_momentum', name: '收割势能', rarity: 'common', desc: '连续击杀获得伤害加成，最多 +30%；2秒未击杀重置。' },
    { id: 'overload_gauge', name: '过载电容', rarity: 'rare', desc: '低于半血时，对敌人伤害 +25%。' },
    { id: 'orbital_matrix', name: '相位阵列', rarity: 'rare', desc: '环绕相位刃与折跃斩击伤害 +25%。' },
    { id: 'vampire_cell', name: '再生回路', rarity: 'rare', desc: '击破精英怪回复 12 点生命值。' },
    { id: 'ammo_forge', name: '重装弹仓', rarity: 'rare', desc: '飞弹、离子弹伤害 +22%。' },
    { id: 'shock_afterimage', name: '闪电脉冲', rarity: 'legendary', desc: '每次精准折跃额外打击附近最多3名敌人（不会延长无敌）。' },
    { id: 'crystal_miner', name: '星尘矿工', rarity: 'common', desc: '每击败30个非Boss敌人，获得额外晶体奖励。' },
    { id: 'danger_reactor', name: '孤注一掷', rarity: 'legendary', desc: '低于30%生命时伤害 +55%，不额外提供无敌。' },
    { id: 'piercing_emitter', name: '聚焦激光', rarity: 'common', desc: '激光伤害 +30%。' },
    { id: 'fusion_catalyst', name: '融合催化剂', rarity: 'legendary', desc: '已融合武器或折跃攻击伤害额外提升20%。' },
    { id: 'magnet_cache', name: '拾荒缓存', rarity: 'common', desc: '获取时恢复15点生命并获得20晶体。' },
    { id: 'void_resonance', name: '虚空共振仪', rarity: 'rare', desc: '敌人受到星网连线、死印或破虚突击影响时，承受伤害额外 +25%。' },
    { id: 'warp_capacitor', name: '跃迁电容', rarity: 'legendary', desc: '处于折跃、闪现或潜行姿态时，伤害提升 28%。' }
  ]);
  const byId = new Map(definitions.map(def => [def.id, def]));
  const owns = (game, id) => Boolean(game.endlessState?.relics?.includes(id));

  function available(game) {
    const owned = new Set(game.endlessState?.relics || []);
    return definitions.filter(def => !owned.has(def.id));
  }
  function choose(game, count = 3, random = Math.random) {
    const entries = available(game).map(def => ({
      def, weight: def.rarity === 'common' ? 55 : def.rarity === 'rare' ? 32 : 13
    }));
    const chosen = [];
    while (entries.length && chosen.length < count) {
      const sum = entries.reduce((a, b) => a + b.weight, 0);
      let roll = random() * sum;
      let index = entries.findIndex(item => (roll -= item.weight) < 0);
      if (index < 0) index = entries.length - 1;
      chosen.push(entries.splice(index, 1)[0].def);
    }
    return chosen;
  }
  function acquire(game, id) {
    const def = byId.get(id);
    if (!def || !game.endlessMode || owns(game, id)) return false;
    game.endlessState.relics.push(id);
    if (id === 'glass_reactor') {
      game.player.maxHp = Math.max(30, Math.round(game.player.maxHp * 0.75));
      game.player.hp = Math.min(game.player.hp, game.player.maxHp);
    }
    if (id === 'magnet_cache') {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 15);
      game.player.crystals += 20;
    }
    return true;
  }
  function modifyDamage(game, target, amount, source) {
    if (!game.endlessMode || !game.endlessState?.relics?.length) return amount;
    const p = game.player;
    let multiplier = 1;
    if (owns(game, 'glass_reactor')) multiplier *= 1.35;
    if (owns(game, 'boss_hunter') && target.isBoss) multiplier *= 1.30;
    if (owns(game, 'frost_core') && (target.freezeTimer || 0) > 0) multiplier *= 1.28;
    if (owns(game, 'overload_gauge') && p.hp <= p.maxHp * 0.5) multiplier *= 1.25;
    if (owns(game, 'danger_reactor') && p.hp <= p.maxHp * 0.3) multiplier *= 1.55;
    if (owns(game, 'phase_hunter') && (source === 'dash' || source === 'astra_fold' || source === 'phantom_eject' || source === 'phantom_scythe')) multiplier *= 1.40;
    if (owns(game, 'ember_engine') && (source === 'fire' || source === 'astra_meteor' || source === 'astra_singularity')) multiplier *= 1.45;
    if (owns(game, 'orbital_matrix') && (source === 'orbit' || source === 'dash' || source === 'astra_weave_link' || source === 'phantom_orb_decay')) multiplier *= 1.25;
    if (owns(game, 'ammo_forge') && (source === 'missile' || source === 'blaster' || source === 'astra_weave_bolt' || source === 'astra_weave_burst' || source === 'phantom_orb_impact' || source === 'phantom_dart')) multiplier *= 1.22;
    if (owns(game, 'piercing_emitter') && (source === 'laser' || source === 'astra_skyfall' || source === 'phantom_beam')) multiplier *= 1.30;
    if (owns(game, 'reaper_momentum') && game.survivalTime <= (game.endlessState.killStreakUntil || 0)) {
      multiplier *= 1 + Math.min(0.3, (game.endlessState.killStreak || 0) * 0.03);
    }
    if (owns(game, 'void_resonance')) {
      const isMarked = target.marked || target.phantomMarked ||
        (p.astraArsenal?.marks?.has(target) && (p.astraArsenal.marks.get(target) || 0) > (game.survivalTime || 0)) ||
        (p.riftSurgeTimer || 0) > 0;
      if (isMarked) multiplier *= 1.25;
    }
    if (owns(game, 'warp_capacitor') && (p.invulnTimer > 0 || (p.riftSurgeTimer || 0) > 0 || p.dashTimeLeft > 0 || p.phantom?.shiftActive)) {
      multiplier *= 1.28;
    }
    if (owns(game, 'fusion_catalyst') && (game.endlessState.fusions?.length || 0) &&
        (['dash', 'laser', 'tesla', 'missile', 'cryo', 'fire', 'nova', 'fusion'].includes(source) ||
         source.startsWith('astra_') || source.startsWith('phantom_'))) {
      multiplier *= 1.20;
    }
    return amount * multiplier;
  }
  function onKill(game, enemy, source) {
    if (!game.endlessMode || !game.endlessState) return;
    const state = game.endlessState;
    if (owns(game, 'reaper_momentum') && source !== 'nuke') {
      state.killStreak = game.survivalTime <= (state.killStreakUntil || 0) ? Math.min(10, (state.killStreak || 0) + 1) : 1;
      state.killStreakUntil = game.survivalTime + 2;
    }
    if (enemy.isElite && owns(game, 'vampire_cell')) game.player.hp = Math.min(game.player.maxHp, game.player.hp + 12);
    if (!enemy.isBoss && owns(game, 'crystal_miner')) {
      state.minedKills = (state.minedKills || 0) + 1;
      if (state.minedKills % 30 === 0) game.player.crystals += 12;
    }
  }
  function onPreciseDash(game, enemy) {
    if (!owns(game, 'shock_afterimage') || !game.endlessMode) return;
    let hits = 0;
    for (const target of game.enemies) {
      if (target.dead || target === enemy) continue;
      if (Math.hypot(target.x - enemy.x, target.y - enemy.y) > 180) continue;
      game.dealDamage(target, 80 * game.player.dmgMultiplier, 'relic');
      if (++hits >= 3) break;
    }
    game.shockwaves.push({ x: enemy.x, y: enemy.y, radius: 8, maxRadius: 180, alpha: 0.8, color: '#00f3ff' });
  }
  window.NeonRogueRelics = Object.freeze({ definitions, available, choose, acquire, owns, modifyDamage, onKill, onPreciseDash });
})();
