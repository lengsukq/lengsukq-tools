/* Auto-registered ship plugin */
window.NeonShips.register({
    id: 'phantom', code: 'PHANTOM', name: '幽灵·共生拟态',
    description: '持续虚无潜行、虚空聚怪/推斥与极速推进、连锁死印殉爆战舰', playable: true,
    baseStats: { hp: 92, speed: 265, regen: 0.75, dashCharges: 2 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 2 },
    startingWeapon: 'phantom_scythe', passiveId: null,
    activeSkillIds: ['spectral_shift', 'dock_link'],
    warpTreeId: 'spectral', rendererId: 'phantom'
  });
