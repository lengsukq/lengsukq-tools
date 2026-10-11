/* Auto-registered ship plugin */
window.NeonShips.register({
    id: 'phantom', code: 'PHANTOM', name: '幽灵·共生拟态',
    description: '虚无潜行、灵魂烙印引爆与联机共生挂载战舰', playable: true,
    baseStats: { hp: 85, speed: 260, regen: 0.5, dashCharges: 2 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 2 },
    startingWeapon: 'phantom_scythe', passiveId: null,
    activeSkillIds: ['spectral_shift', 'dock_link'],
    warpTreeId: 'spectral', rendererId: 'phantom'
  });
