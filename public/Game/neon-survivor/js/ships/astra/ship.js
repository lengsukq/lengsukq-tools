/* Auto-registered ship plugin */
// V5's mage archetype is registered for tooling, tests and forthcoming
  // character selection; all class weapons, active controls and host-authoritative
  // guest spell requests now load from the ship's own plugin directory.
  window.NeonShips.register({
    id: 'astra', code: 'ASTRA', name: '星织·织界术师',
    description: '星能法术、局部结界与攻守混合相位闪现', playable: true,
    baseStats: { hp: 95, speed: 235, regen: 0.8, dashCharges: 2 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 2 },
    startingWeapon: 'star_weave', passiveId: null,
    activeSkillIds: ['meteor', 'ward'],
    warpTreeId: 'phase', rendererId: 'astra'
  });
