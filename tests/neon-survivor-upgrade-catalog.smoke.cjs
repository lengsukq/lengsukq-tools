/* Run: node tests/neon-survivor-upgrade-catalog.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root='public/Game/neon-survivor/js/';
const context={window:{addEventListener(){}}, console,
  document:{getElementById(){return null;}},
  navigator:{getGamepads(){return [];}},
  localStorage:{getItem(){return null;},setItem(){}},
  performance:{now:()=>1000},setTimeout,clearTimeout,setInterval,clearInterval};
vm.createContext(context);
for(const name of ['ships','ships.generated','rarity','core'])
  vm.runInContext(fs.readFileSync(root+name+'.js','utf8'),context);
const registry=context.window.NeonShips;
const proto=vm.runInContext('NeonSurvivorGame.prototype',context);
const originalCards=vm.runInContext('UPGRADES_DB',context);
const rift={shipId:'riftblade',weapons:{blaster:1},passives:{},dashUpgrades:{},level:10};
const game=Object.create(proto);
game.player=rift;game.difficulty=0;game.getPassiveSlotLimit=()=>4;
game.renderWeaponsHUD=()=>{};
assert.equal(game.getUpgradeCatalog(rift),originalCards);
const ids=['mage1','defender','scout','fifth','sixth'];
for(const id of ids){
  registry.register({id,name:id,playable:true,baseStats:{hp:95,speed:220,regen:.7,dashCharges:2},
    startingWeapon:'arc_bolt',activeSkillIds:['meteor'],rendererId:'riftblade',warpTreeId:'phase'});
  registry.registerUpgradeCatalog(id,[
    {id:`${id}_bolt`,type:'weapon',rarity:'common',name:'Arc',maxLvl:5},
    {id:`${id}_shield`,type:'passive',rarity:'rare',name:'Ward',maxLvl:5},
    {id:`${id}_blink`,type:'dash',rarity:'legendary',name:'Blink',maxLvl:4}
  ]);
  const pilot={shipId:id,weapons:{},passives:{},dashUpgrades:{},level:10};
  const catalog=game.getUpgradeCatalog(pilot);
  assert.equal(catalog.length,3);
  assert.ok(catalog.every(card=>card.shipId===id));
  assert.equal(game.getCoopUpgradeDefinition(`${id}_bolt`,pilot).id,`${id}_bolt`);
  assert.equal(game.getCoopUpgradeDefinition('blaster',pilot),null);
  const drawn=game.getCoopUpgradeChoices(pilot);
  assert.ok(drawn.length>=1 && drawn.every(item=>item.startsWith(id+'_')));
  assert.ok(drawn.includes(`${id}_blink`),'Legendary pity must draw from active class');
}
assert.throws(()=>registry.registerUpgradeCatalog('mage1',[]),/already registered/);
assert.equal(game.getUpgradeCatalog({shipId:'astra'}),originalCards,
  'Locked preview cannot inject incomplete cards into a real run');
let handled=0;
registry.registerAbilities('mage1',{onUpgrade(pilot,world,card){
  assert.equal(world,game);
  assert.equal(card.id,'mage1_bolt');
  pilot.weapons[card.id]=(pilot.weapons[card.id]||0)+1;
  handled++;
  return true;
}});
game.player={shipId:'mage1',weapons:{},passives:{},dashUpgrades:{}};
game.applyUpgrade(game.getCoopUpgradeDefinition('mage1_bolt',game.player));
assert.equal(game.player.weapons.mage1_bolt,1);
assert.equal(handled,1);
assert.throws(()=>registry.registerUpgradeCatalog('nonexistent',[]),/Unknown ship/);
console.log('Ship-specific upgrade catalogs passed: six different playable types, rarity pity isolation and onUpgrade hooks.');
