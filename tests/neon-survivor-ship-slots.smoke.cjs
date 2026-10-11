/* Run: node tests/neon-survivor-ship-slots.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
class Node {
  constructor() { this.children = []; this.style = {}; this.className = ''; }
  set innerHTML(value) { this.content = value; this.children = []; }
  get innerHTML() { return this.content || ''; }
  appendChild(node) { this.children.push(node); return node; }
}
const ctx = {
  window: {addEventListener(){}}, console, performance:{now:()=>1000},
  document:{createElement:()=>new Node(),getElementById:()=>null},
  navigator:{getGamepads:()=>[]},
  localStorage:{getItem:()=>null,setItem(){}},
  setTimeout,clearTimeout,setInterval,clearInterval
};
vm.createContext(ctx);
for (const file of ['ships','ships.generated','core']) {
  vm.runInContext(fs.readFileSync(root + file + '.js','utf8'),ctx);
}
const registry = ctx.window.NeonShips;
const proto = vm.runInContext('NeonSurvivorGame.prototype',ctx);
for (const [id, hp, speed, regen, skillCount] of [
  ['riftblade',100,240,.8,0], ['astra',95,235,.8,2], ['phantom',85,260,.5,2]
]) {
  const ship = registry.get(id);
  assert.equal(ship.playable,true);
  assert.equal(ship.baseStats.hp,hp);
  assert.equal(ship.baseStats.speed,speed);
  assert.equal(ship.baseStats.regen,regen);
  assert.deepEqual(Object.values(registry.slotLimitsFor({shipId:id},0)),
    [4,4,7,skillCount],id + ': base slots');
  assert.deepEqual(Object.values(registry.slotLimitsFor({shipId:id},5)),
    [4,3,7,skillCount],id + ': hard-mode passive penalty');
  assert.ok(Object.isFrozen(ship.slots));
}
assert.throws(()=>registry.register({
  id:'invalid_slots',name:'bad',playable:true,rendererId:'riftblade',
  warpTreeId:'assault',startingWeapon:'blaster',activeSkillIds:[],
  baseStats:{hp:100,speed:240,regen:.8,dashCharges:3},
  slots:{weapons:-1}
}),/Invalid ship slots/);
assert.throws(()=>registry.register({
  id:'invalid_skills',name:'bad',playable:true,rendererId:'riftblade',
  warpTreeId:'assault',startingWeapon:'blaster',activeSkillIds:['a'],
  baseStats:{hp:100,speed:240,regen:.8,dashCharges:3},
  slots:{activeSkills:2}
}),/Invalid ship active skill slots/);
assert.throws(()=>registry.register({
  id:'null_slots',name:'bad',playable:true,rendererId:'riftblade',
  warpTreeId:'assault',startingWeapon:'blaster',activeSkillIds:[],
  baseStats:{hp:100,speed:240,regen:.8,dashCharges:3},slots:null
}),/Invalid ship slots/);
registry.register({
  id:'carrier',name:'Custom five-slot carrier',playable:true,
  rendererId:'riftblade',warpTreeId:'assault',startingWeapon:'blaster',
  activeSkillIds:['boost','ward'],
  baseStats:{hp:140,speed:210,regen:1.2,dashCharges:3},
  slots:{weapons:5,passives:3,warp:2,activeSkills:2}
});
const p={...registry.startingState('carrier'),level:1,dashUpgrades:{},limitBreaks:{},
  dmgMultiplier:1,areaMultiplier:1,critRate:.08,critDmg:1.5,magnetRadius:120};
const game=Object.assign(Object.create(proto),{
  player:p,difficulty:0,endlessMode:false,weaponsBar:new Node()
});
function card(type,id,maxLvl=5) { return {type,id,maxLvl}; }
assert.equal(game.getUpgradeSlotLimits(p).weapons,5);
assert.equal(game.getPassiveSlotLimit(p),3);
for(const id of ['w2','w3','w4'])p.weapons[id]=1;
assert.equal(game.isUpgradeAvailableFor(p,card('weapon','w5')),true,
  'Fourth occupied weapon leaves one carrier slot');
p.weapons.w5=1;
assert.equal(game.isUpgradeAvailableFor(p,card('weapon','w6')),false,
  'Full carrier must reject new weapon');
assert.equal(game.isUpgradeAvailableFor(p,card('weapon','w2')),true,
  'Existing weapon can be upgraded at capacity');
assert.equal(game.isUpgradeAvailableFor(p,card('weapon','w2',1)),false,
  'Maxed-out weapon cannot upgrade');
p.passives={p1:1,p2:1};
assert.equal(game.isUpgradeAvailableFor(p,card('passive','p3')),true);
game.difficulty=5;
assert.equal(game.getPassiveSlotLimit(p),2);
assert.equal(game.isUpgradeAvailableFor(p,card('passive','p3')),false,
  'Ascension V locks one configurable passive slot for host and guests');
assert.equal(game.isUpgradeAvailableFor(p,card('passive','p1')),true);
game.difficulty=0;p.passives.p3=1;
assert.equal(game.isUpgradeAvailableFor(p,card('passive','p4')),false);
p.dashUpgrades={d1:1,d2:1};
assert.equal(game.isUpgradeAvailableFor(p,card('dash','d3')),false,
  'Warp category is capacity-bound like weapon/passive');
assert.equal(game.isUpgradeAvailableFor(p,card('dash','d1')),true);
game.renderWeaponsHUD();
assert.equal(game.weaponsBar.children.length,2);
assert.equal(game.weaponsBar.children[0].children.length,5);
assert.equal(game.weaponsBar.children[1].children.length,3);
game.difficulty=5;game.renderWeaponsHUD();
assert.equal(game.weaponsBar.children[1].children.length,3,
  'Hard mode keeps locked-slot placeholder in the same configured layout');

// Starting HP, speed, and regen survive every class recalculation.
for (const id of ['riftblade','astra','phantom','carrier']) {
  const ship=registry.get(id);
  game.player={...registry.startingState(id),level:1,dashUpgrades:{},
    limitBreaks:{},dmgMultiplier:1,areaMultiplier:1,critRate:.08,critDmg:1.5};
  game.difficulty=0;
  game.recalculatePassives();
  assert.equal(game.player.maxHp,ship.baseStats.hp,id + ': HP reset');
  assert.equal(game.player.regen,ship.baseStats.regen,id + ': regen reset');
  assert.equal(game.player.baseSpeed,ship.baseStats.speed,id + ': speed reset');
  game.player.level=3;
  game.recalculateMoveSpeed();
  assert.equal(game.player.baseSpeed,ship.baseStats.speed+12,id + ': speed growth');
  game.player.passives.armor=1;
  game.recalculatePassives();
  assert.equal(game.player.maxHp,ship.baseStats.hp+35,id + ': armor HP');
  assert.equal(game.player.regen,ship.baseStats.regen+1.8,id + ': armor regen');
}
console.log('Ship loadout abstraction passed: 3 standard ships, custom 5/3/2 slots, authority checks, high-tier difficulty, dynamic HUD, independent speed/HP/regen and registration validation.');
