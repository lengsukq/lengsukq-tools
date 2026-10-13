/* Neon Survivor V3: timed tactical events with explicit victory/failure. */
(() => {
  'use strict';
  const definitions = Object.freeze([
    { id: 'hunt', name: '清剿令', desc: '55秒内击败35名普通敌人', duration: 55, goal: 35, kind: 'normalKills' },
    { id: 'elites', name: '猎首行动', desc: '65秒内击破3名精英敌人', duration: 65, goal: 3, kind: 'eliteKills' },
    { id: 'precision', name: '相位试炼', desc: '45秒内完成3次精准折跃/相位穿梭', duration: 45, goal: 3, kind: 'precise' },
    { id: 'endurance', name: '坚持防线', desc: '存活45秒，坚持到底', duration: 45, goal: 45, kind: 'survive' },
    { id: 'untouched', name: '无伤突袭', desc: '40秒内不受到伤害', duration: 40, goal: 40, kind: 'noDamage' },
    { id: 'no_dash', name: '禁跃挑战', desc: '35秒内不使用折跃/闪现/潜行', duration: 35, goal: 35, kind: 'noDash' },
    { id: 'massacre', name: '血色潮汐', desc: '60秒内击败60名非Boss敌人', duration: 60, goal: 60, kind: 'allKills' },
    { id: 'ambush', name: '精锐伏击', desc: '50秒内击破2名精英，战场补充精英单位', duration: 50, goal: 2, kind: 'eliteKills' },
    { id: 'resonance_strike', name: '共振强袭', desc: '50秒内消灭4名被死印、星网或易伤影响的敌人', duration: 50, goal: 4, kind: 'resonance' }
  ]);
  const byId = new Map(definitions.map(d => [d.id, d]));
  function begin(game, random = Math.random) {
    const state = game.endlessState;
    if (!game.endlessMode || state.event) return null;
    const pool = definitions.filter(d => d.id !== state.lastEventId);
    const def = pool[Math.floor(random() * pool.length)];
    state.lastEventId = def.id;
    state.event = { id: def.id, remaining: def.duration, progress: 0, failed: false };
    if (def.id === 'ambush' || def.id === 'elites') game.spawnEliteIncursion();
    game.texts.push({ x: game.player.x, y: game.player.y - 70,
      text: '战术事件：' + def.name, color: '#ffee77', size: 22, life: 2.4, maxLife: 2.4 });
    return state.event;
  }
  function award(game, success) {
    const state = game.endlessState;
    if (!state.event) return;
    state.eventsDone = (state.eventsDone || 0) + 1;
    const def = byId.get(state.event.id);
    if (success) {
      state.eventsWon = (state.eventsWon || 0) + 1;
      game.player.crystals += 25;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 12);
    }
    game.texts.push({ x: game.player.x, y: game.player.y - 60,
      text: (success ? '完成：' : '未完成：') + def.name + (success ? ' +25 晶体' : ''),
      color: success ? '#77ffaa' : '#ff7777', size: 20, life: 1.8, maxLife: 1.8 });
    state.event = null;
  }
  function update(game, dt) {
    const event = game.endlessState?.event;
    if (!event) return;
    event.remaining = Math.max(0, event.remaining - dt);
    const def = byId.get(event.id);
    if (def.kind === 'survive' || def.kind === 'noDash' || def.kind === 'noDamage') {
      event.progress = Math.max(0, def.duration - event.remaining);
    }
    if (event.failed) award(game, false);
    else if (event.progress >= def.goal) award(game, true);
    else if (event.remaining <= 0) award(game, false);
  }
  function onKill(game, enemy) {
    const event = game.endlessState?.event;
    if (!event) return;
    const kind = byId.get(event.id).kind;
    if (kind === 'normalKills' && !enemy.isBoss && !enemy.isElite) event.progress++;
    if (kind === 'allKills' && !enemy.isBoss) event.progress++;
    if (kind === 'eliteKills' && enemy.isElite) event.progress++;
    if (kind === 'resonance' && (enemy.marked || enemy.phantomMarked || (game.player?.astraArsenal?.marks?.has(enemy)) || (game.player?.riftSurgeTimer || 0) > 0)) event.progress++;
  }
  function onPreciseDash(game) {
    const event = game.endlessState?.event;
    if (event && byId.get(event.id).kind === 'precise') event.progress++;
  }
  function onDash(game) {
    const event = game.endlessState?.event;
    if (event && byId.get(event.id).kind === 'noDash') event.failed = true;
  }
  function onDamageTaken(game) {
    const event = game.endlessState?.event;
    if (event && byId.get(event.id).kind === 'noDamage') event.failed = true;
  }
  function description(game) {
    const event = game.endlessState?.event;
    if (!event) return '';
    const def = byId.get(event.id);
    return `${def.name} · ${Math.min(def.goal, Math.floor(event.progress))}/${def.goal} · ${Math.ceil(event.remaining)}s`;
  }
  window.NeonRogueEvents = Object.freeze({ definitions, begin, update, onKill, onPreciseDash, onDash, onDamageTaken, description });
})();
