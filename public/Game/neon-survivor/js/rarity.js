/* Shared weighted card rolls for solo, endless and both co-op pilots.
 * Roll the rarity first, then choose a card inside that rarity. Otherwise a
 * larger catalog of rare cards distorts the intended rarity distribution.
 * If a rarity is exhausted, the remaining odds are renormalized.
 */
(() => {
  'use strict';
  const BASE = Object.freeze({ common: 60, rare: 28, legendary: 12 });
  const ASCENSION = Object.freeze([
    [1, 1], [1, 1], [1, 1], [0.90, 0.80],
    [0.80, 0.65], [0.70, 0.50], [0.60, 0.35]
  ]);
  function weights(difficulty = 0) {
    const level = Math.max(0, Math.min(6, Math.floor(Number(difficulty) || 0)));
    const [rareFactor, legendaryFactor] = ASCENSION[level];
    return {
      common: BASE.common,
      rare: BASE.rare * rareFactor,
      legendary: BASE.legendary * legendaryFactor
    };
  }
  function pick(eligible, count = 3, difficulty = 0, random = Math.random) {
    const pool = Array.isArray(eligible) ? [...eligible] : [];
    const result = [];
    const odds = weights(difficulty);
    while (pool.length && result.length < count) {
      const tiers = Object.keys(odds).filter(tier => pool.some(card => card.rarity === tier));
      const total = tiers.reduce((sum, tier) => sum + odds[tier], 0);
      if (total <= 0) break;
      let roll = Math.max(0, Math.min(.999999999999, Number(random()) || 0)) * total;
      const rarity = tiers.find(tier => (roll -= odds[tier]) < 0) || tiers[tiers.length - 1];
      const indices = pool.map((card, index) => card.rarity === rarity ? index : -1)
        .filter(index => index >= 0);
      const offset = Math.min(indices.length - 1, Math.floor(
        Math.max(0, Math.min(.999999999999, Number(random()) || 0)) * indices.length));
      const index = indices[offset];
      result.push(pool.splice(index, 1)[0]);
    }
    return result;
  }
  const PITY_LEVEL = 10;
  function hasLegendary(player, catalog) {
    if (!player || !Array.isArray(catalog)) return false;
    return catalog.some(card => {
      if (card.rarity !== 'legendary') return false;
      const group = card.type === 'weapon' ? player.weapons :
        card.type === 'passive' ? player.passives :
          card.type === 'dash' ? player.dashUpgrades : null;
      return Number(group?.[card.id] || 0) > 0;
    });
  }
  // Pity counts acquired abilities, not cards merely offered. Until the
  // pilot picks a legendary, one valid legendary is offered every level >=10.
  // No illegal new weapon/passive slots or banished cards are introduced.
  function pickForPilot(eligible, count, difficulty, player, catalog, random = Math.random) {
    const pool = Array.isArray(eligible) ? eligible : [];
    if (count <= 0 || (player?.level || 0) < PITY_LEVEL ||
        hasLegendary(player, catalog)) return pick(pool, count, difficulty, random);
    const legendary = pool.filter(card => card.rarity === 'legendary');
    if (!legendary.length) return pick(pool, count, difficulty, random);
    const roll = Math.max(0, Math.min(.999999999999, Number(random()) || 0));
    const guaranteed = legendary[Math.floor(roll * legendary.length)];
    const remainder = pool.filter(card => card.id !== guaranteed.id);
    return [{ ...guaranteed, pityGuaranteed: true },
      ...pick(remainder, count - 1, difficulty, random)];
  }
  window.NeonUpgradeRarity = Object.freeze({ weights, pick, pickForPilot, hasLegendary, PITY_LEVEL });
})();
