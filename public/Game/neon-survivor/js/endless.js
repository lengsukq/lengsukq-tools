/* Neon Survivor V3: endless stages, route decisions, boss affixes, and rewards. */
(() => {
  'use strict';
  const routes = Object.freeze([
    { id: 'hunt', name: '猎杀战区', desc: '精英出现 +30%、敌方生命 +15%，精英挑战更密集。', enemyHp: 1.15, elite: 1.30, drops: 1 },
    { id: 'supply', name: '补给战区', desc: '治疗与磁铁掉率提升50%，适合稳健构筑。', enemyHp: 1, elite: 1, drops: 1.5 },
    { id: 'rift', name: '裂隙战区', desc: '敌方生命 +10%，击破首领后额外获得30晶体。', enemyHp: 1.10, elite: 1.1, drops: 1 }
  ]);
  const affixes = Object.freeze([
    { id: 'armored', name: '量子装甲', desc: '降低承受的伤害' },
    { id: 'regenerating', name: '再生核心', desc: '周期性恢复生命值' },
    { id: 'barrage', name: '散射轰炸', desc: '周期性追加可预判弹幕' },
    { id: 'frenzy', name: '狂热推进', desc: '移动速度提高' },
    { id: 'summoner', name: '召唤大师', desc: '定时呼叫援军' }
  ]);
  const getState = game => game.endlessState;
  function pickUpgrades(eligible, count = 3, random = Math.random) {
    const pool = [...eligible];
    const result = [];
    const weights = { common: 60, rare: 28, legendary: 12 };
    while (pool.length && result.length < count) {
      const total = pool.reduce((sum, card) => sum + (weights[card.rarity] || 28), 0);
      let roll = random() * total;
      let index = pool.findIndex(card => (roll -= (weights[card.rarity] || 28)) < 0);
      if (index < 0) index = pool.length - 1;
      result.push(pool.splice(index, 1)[0]);
    }
    return result;
  }
  function reset(game) {
    game.endlessState = {
      stage: 0, relics: [], fusions: [], routeId: 'supply',
      nextEventAt: 0, event: null, eventsWon: 0, eventsDone: 0,
      killStreak: 0, killStreakUntil: 0, lastEventId: null
    };
    window.NeonRogueUI?.update(game);
  }
  function getRoute(game) {
    return routes.find(route => route.id === getState(game)?.routeId) || routes[1];
  }
  function getEnemyHpMultiplier(game) {
    return game.endlessMode ? getRoute(game).enemyHp : 1;
  }
  function getDropMultiplier(game) {
    return game.endlessMode ? getRoute(game).drops : 1;
  }
  function getEliteMultiplier(game) {
    return game.endlessMode ? getRoute(game).elite : 1;
  }
  function start(game) {
    if (!getState(game)) reset(game);
    game.endlessMode = true;
    game.state = 'playing';
    game.lastTime = performance.now();
    getState(game).stage = Math.max(1, game.bossCycle);
    getState(game).nextEventAt = game.survivalTime + 65;
    offerRewards(game, '无尽启程 · 选择战术遗物');
  }
  function offerRewards(game, title) {
    const picked = window.NeonRogueRelics.choose(game, 3);
    const fusions = window.NeonRogueFusions.available(game);
    const options = picked.map(def => ({ ...def, kind: 'relic' }));
    if (fusions.length) options.splice(Math.min(2, options.length - 1), 1, { ...fusions[0], kind: 'fusion' });
    if (!options.length) options.push({ id: 'fallback', name: '裂隙补给', desc: '恢复25生命并获得40晶体。', kind: 'fallback' });
    window.NeonRogueUI.open(game, title, options, choice => {
      if (choice.kind === 'relic') window.NeonRogueRelics.acquire(game, choice.id);
      else if (choice.kind === 'fusion') window.NeonRogueFusions.acquire(game, choice.id);
      else {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
        game.player.crystals += 40;
      }
      offerRoutes(game);
    });
  }
  function offerRoutes(game) {
    window.NeonRogueUI.open(game, '选择下一个无尽战区', routes, route => {
      getState(game).routeId = route.id;
      getState(game).nextEventAt = game.survivalTime + 65;
      window.NeonRogueUI.update(game);
    });
  }
  function onBossDefeated(game) {
    if (!game.endlessMode) return;
    const st = getState(game);
    if (!st) return;
    st.stage = Math.max(st.stage, game.bossCycle);
    if (st.routeId === 'rift') game.player.crystals += 30;
    st.event = null;
    // Defer until the current damage/death iteration completes.
    setTimeout(() => {
      if (game.state === 'playing' && game.endlessMode) offerRewards(game, '首领战利品 · 构筑进化');
    }, 0);
  }
  function decorateBoss(game, boss) {
    if (!game.endlessMode || !boss) return;
    const count = game.bossCycle >= 4 ? 2 : 1;
    const pool = [...affixes];
    boss.rogueAffixes = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      boss.rogueAffixes.push(pool.splice(idx, 1)[0].id);
    }
    boss.rogueAffixTimer = 0;
    if (boss.rogueAffixes.includes('frenzy')) boss.speed *= 1.18;
    const title = document.getElementById('boss-name');
    if (title) title.textContent += ' · ' + boss.rogueAffixes
      .map(id => affixes.find(a => a.id === id)?.name).join(' + ');
  }
  function updateBossAffixes(game, dt) {
    const boss = game.currentBoss;
    if (!boss || boss.dead || !boss.rogueAffixes?.length) return;
    if (boss.rogueAffixes.includes('regenerating')) {
      boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * dt * 0.003);
    }
    boss.rogueAffixTimer = (boss.rogueAffixTimer || 0) + dt;
    if (boss.rogueAffixes.includes('barrage') &&
        boss.rogueAffixTimer >= 4.25 && !boss.rogueBarrageWarning) {
      boss.rogueBarrageWarning = true;
      game.texts.push({ x: boss.x, y: boss.y - 55,
        text: '⚠ 散射轰炸蓄能 · 注意走位', color: '#ffcc44', size: 16,
        life: 0.85, maxLife: 0.85 });
      game.shockwaves.push({ x: boss.x, y: boss.y, radius: 8,
        maxRadius: 130, alpha: 0.85, color: '#ffdd66' });
    }
    if (boss.rogueAffixTimer < 5) return;
    boss.rogueAffixTimer = 0;
    boss.rogueBarrageWarning = false;
    if (boss.rogueAffixes.includes('barrage') && game.enemyBullets.length < 130) {
      const aim = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
      for (let i = -2; i <= 2; i++) {
        const a = aim + i * 0.28;
        game.enemyBullets.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
          radius: 5, color: '#ffcc44', damage: 16, life: 3.5
        });
      }
      game.texts.push({ x: boss.x, y: boss.y - 55, text: '散射轰炸！', color: '#ffcc44', size: 16, life: 1, maxLife: 1 });
    }
    if (boss.rogueAffixes.includes('summoner') && game.enemies.length < 120) {
      for (let i = 0; i < 2; i++) {
        game.enemies.push({
          type: 'swarmer', x: boss.x + (i ? 80 : -80), y: boss.y,
          vx: 0, vy: 0, hp: 90, maxHp: 90, radius: 12,
          speed: 210, color: '#ffaa55', xpVal: 3, damage: 16
        });
      }
    }
  }
  function update(game, dt) {
    if (!game.endlessMode || game.state !== 'playing' || !getState(game)) return;
    window.NeonRogueEvents.update(game, dt);
    updateBossAffixes(game, dt);
    const st = getState(game);
    if (!st.event && st.nextEventAt && game.survivalTime >= st.nextEventAt && !game.currentBoss) {
      st.nextEventAt = game.survivalTime + 180;
      window.NeonRogueEvents.begin(game);
    }
  }
  function onKill(game, enemy, source) {
    if (!game.endlessMode) return;
    window.NeonRogueRelics.onKill(game, enemy, source);
    window.NeonRogueFusions.onKill(game, enemy, source);
    window.NeonRogueEvents.onKill(game, enemy);
    if (enemy.isBoss) onBossDefeated(game);
  }
  function onDash(game) {
    if (game.endlessMode) window.NeonRogueEvents.onDash(game);
  }
  function onPreciseDash(game, target) {
    if (!game.endlessMode) return;
    window.NeonRogueRelics.onPreciseDash(game, target);
    window.NeonRogueFusions.onPreciseDash(game, target);
    window.NeonRogueEvents.onPreciseDash(game);
  }
  function onDamageTaken(game) {
    if (game.endlessMode) window.NeonRogueEvents.onDamageTaken(game);
  }
  window.NeonRogueEndless = Object.freeze({
    routes, affixes, reset, start, update, getRoute,
    pickUpgrades,
    getEnemyHpMultiplier, getDropMultiplier, getEliteMultiplier,
    decorateBoss, onBossDefeated, onKill, onDash, onPreciseDash, onDamageTaken
  });
})();
