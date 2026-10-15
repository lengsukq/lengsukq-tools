/* Host-authoritative co-op difficulty scaling, and the dispatch layer for the
 * co-op-only bosses. No additional server is needed; the LAN host simulates
 * every mechanic, and the boss archetypes themselves live in coop-bosses.js.
 */
(() => {
  'use strict';
  const TUNING = Object.freeze({
    normalHp: 1.35, eliteHp: 1.45, bossHp: 1.65,
    enemyDamage: 1.12, spawnInterval: 0.9
  });
  function active(game) {
    return Boolean(game?.lanCoop?.ally && game.lanCoop.rtc?.connected &&
      game.lanCoop.rtc.role === 'host');
  }
  // --- Party scaling: the QUANTITY axis ---------------------------------------
  // Enemy HP already scales gently with party size (see scaleByParty below).
  // That alone made a four-pilot room EASIER than solo: team damage grows ~x4
  // while enemy HP grows ~x2, and the normal-enemy ceiling stayed at 100 for
  // every party size, so each pilot faced a quarter of the solo crowd.
  //
  // Quantity is what closes that gap, so one coefficient drives every quantity
  // dimension -- the alive ceiling, the spawn cadence and the swarm size -- and
  // it is derived from the SAME connected-guest count as the HP curve. Keeping
  // them on one input is what stops the two from drifting apart.
  //
  // `allies` holds guests only (coop.js startHost seats 'guest', 'guest-2',
  // 'guest-3'), so 1 connected guest means a two-pilot room. The `ally`
  // fallback covers the legacy single-ally shape.
  function connectedGuests(game) {
    const allies = game?.lanCoop?.allies;
    if (allies && allies.size) {
      return [...allies.values()].filter(p => !p.disconnected).length;
    }
    return game?.lanCoop?.ally ? 1 : 0;
  }
  /** 1.0 solo / 1.3 two pilots / 1.6 three / 1.9 four. */
  function partyScale(game) {
    return active(game) ? 1 + 0.3 * connectedGuests(game) : 1;
  }
  /** Normal-enemy alive ceiling: +30 per additional pilot. */
  function normalEnemyCap(game) {
    return Math.round(100 * partyScale(game));
  }
  /**
   * Multiplier for the spawn interval. Scaling has to be applied AFTER the
   * simulation's 0.16s floor, never before: a scaled floor would cap a
   * four-pilot room at the solo spawn rate and the raised ceiling could never
   * actually fill.
   */
  function spawnIntervalScale(game) {
    return active(game) ? TUNING.spawnInterval / partyScale(game) : 1;
  }
  /** A wave authored for one pilot, sized for the party. */
  function swarmCount(game, base) {
    return Math.round(base * partyScale(game));
  }
  /** Enemy HP by party size. Deliberately gentle: quantity carries the rest. */
  function scaleByParty(game) {
    const joined = game.lanCoop?.allies
      ? [...game.lanCoop.allies.values()].filter(p => !p.disconnected).length : 1;
    return 1 + Math.max(0, joined - 1) * .27;
  }
  function scaleNewEnemies(game) {
    if (!active(game)) return;
    for (const enemy of game.enemies || []) {
      if (enemy.coopScaled) continue;
      const multiplier = (enemy.isBoss ? TUNING.bossHp :
        enemy.isElite ? TUNING.eliteHp : TUNING.normalHp) * scaleByParty(game);
      enemy.hp = Math.round(enemy.hp * multiplier);
      enemy.maxHp = Math.round(enemy.maxHp * multiplier);
      enemy.coopScaled = true;
    }
  }

  // --- Co-op boss dispatch ----------------------------------------------------
  // The archetypes live in coop-bosses.js, one registry loaded before this file.
  // This module keeps the entry points the rest of the game already calls -- the
  // simulation (enemies.js), the damage path (damage.js), the reward path
  // (rewards.js) and the two render paths (coop.js) -- and owns the one rule
  // that must never move:
  //
  //   A boss is only shielded while the encounter is ACTIVE. The moment the room
  //   stops hosting, damage goes through untouched, so a guest that disconnects
  //   can never leave behind a boss nobody is able to kill.
  //
  // Delegation is lazy (`window.NeonLanCoopBosses?.`) so this file keeps working
  // when a test loads it on its own.
  const bosses = () => window.NeonLanCoopBosses;

  function isCoopBoss(type) {
    return Boolean(bosses()?.isCoopBoss?.(type));
  }
  function createDualBoss(game, x, y, hpScale, dmgScale) {
    return bosses()?.createOf('boss_dual_reactor', game, x, y, hpScale, dmgScale) || null;
  }
  /** The co-op boss for this cycle; every second boss is a co-op encounter. */
  function createCoopBoss(game, x, y, hpScale, dmgScale) {
    return bosses()?.create(game, x, y, hpScale, dmgScale) || null;
  }
  function capturePoints(boss, partySize) {
    return bosses()?.capturePoints(boss, partySize) || [];
  }
  function captureStatus(game, boss) {
    if (!active(game) || !isCoopBoss(boss?.type)) {
      return { points: [], occupied: [], count: 0, synced: false,
        both: false, left: false, right: false };
    }
    return bosses().captureStatus(game, boss);
  }
  function updateBoss(game, boss, dt) {
    if (!boss || boss.dead || !isCoopBoss(boss.type)) return;
    bosses()?.update(game, boss, dt);
  }
  function modifyBossDamage(game, boss, amount) {
    if (!isCoopBoss(boss?.type) || !active(game)) return amount;
    return amount * (bosses()?.damageMultiplier(game, boss) ?? 1);
  }
  function renderBoss(ctx, game, boss) {
    if (boss?.dead || !isCoopBoss(boss?.type)) return;
    if (!active(game) && !game.isGuestWorldView) return;
    bosses()?.render(ctx, game, boss);
  }
  function bonusOnVictory(game, boss) {
    if (!isCoopBoss(boss?.type) || !active(game)) return;
    bosses()?.onVictory(game, boss);
  }

  window.NeonLanEncounters = Object.freeze({
    TUNING, active,
    connectedGuests, partyScale, normalEnemyCap, spawnIntervalScale, swarmCount,
    scaleNewEnemies,
    isCoopBoss, createDualBoss, createCoopBoss, capturePoints,
    captureStatus, updateBoss, modifyBossDamage, renderBoss, bonusOnVictory
  });
})();
