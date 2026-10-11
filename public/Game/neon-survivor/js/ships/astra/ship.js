/* Auto-registered ship plugin */
// V5's mage archetype is registered for tooling, tests and forthcoming
  // character selection, but remains LOCKED until all 9/8/7 unique cards,
  // active controls and authoritative co-op ability hooks are implemented.
  window.NeonShips.register({
    id: 'astra', code: 'ASTRA', name: '星织·织界术师',
    description: '星能法术、局部结界与攻守混合相位闪现', playable: false,
    baseStats: { hp: 95, speed: 235, regen: 0.8, dashCharges: 2 },
    startingWeapon: 'star_weave', passiveId: null,
    activeSkillIds: ['meteor', 'ward'],
    warpTreeId: 'phase', rendererId: 'astra'
  });
