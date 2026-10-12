/* Run: node tests/neon-survivor-three-playable-ships.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='public/Game/neon-survivor/js/';
const world={window:{},console,performance:{now:()=>1000},setTimeout,clearTimeout};
vm.createContext(world);
for(const module of ['ships','ships.generated','players','combat/pilots','combat/weapons','network/coop'])
  vm.runInContext(fs.readFileSync(root+module+'.js','utf8'),world);
const ships=world.window.NeonShips;
assert.deepEqual(Array.from(ships.list(),s=>s.id).sort(),['astra','phantom','riftblade']);
const {createRemotePilot,PlayerRegistry}=world.window.NeonPlayers;
const hits=[];
const game={state:'playing',survivalTime:12,shockwaves:[],texts:[],bullets:[],
  enemies:[{x:105,y:0,hp:100000,maxHp:100000,radius:16,dead:false},
    {x:110,y:20,hp:100000,maxHp:100000,radius:16,dead:false}],
  enemyBullets:[],dashTrails:[],players:new PlayerRegistry(),
  dealDamage(enemy,value,source,_force,owner){
    assert.ok(Number.isFinite(value)&&value>0);
    hits.push({owner,source,value});enemy.hp-=value;
  }};
game.player={...ships.startingState('riftblade'),id:'host',playerId:'host',
  x:0,y:0,hp:100,level:1,xp:0,xpNeeded:100,dmgMultiplier:1,passives:{},
  dashUpgrades:{},timers:{},cdrMultiplier:1};
game.players.register('host',game.player);
const mage=createRemotePilot(game,'guest','astra');
const ghost=createRemotePilot(game,'guest-2','phantom');
game.players.register('guest',mage);
game.players.register('guest-2',ghost);
assert.equal(mage.shipId,'astra');assert.equal(ghost.shipId,'phantom');
assert.equal(mage.weapons.star_weave,1);assert.equal(ghost.weapons.phantom_scythe,1);
assert.equal(mage.maxHp,95);assert.equal(ghost.maxHp,85);
for(const pilot of [mage,ghost]){
  ships.runAbility(pilot,'onStart',game);
  assert.equal(ships.upgradeCatalogFor(pilot).length,24);
  assert.equal(ships.upgradeCatalogFor(pilot).filter(card=>card.type==='weapon').length,9);
  assert.equal(ships.upgradeCatalogFor(pilot).filter(card=>card.type==='passive').length,8);
  assert.equal(ships.upgradeCatalogFor(pilot).filter(card=>card.type==='dash').length,7);
}
assert.ok(mage.astra && ghost.phantom);

// All 24 upgrade choices can actually be applied and update the right bag.
for(const pilot of [mage,ghost]){
  for(const card of ships.upgradeCatalogFor(pilot)) {
    assert.equal(ships.runAbility(pilot,'onUpgrade',game,card),true,card.id);
    const bag=card.type==='weapon'?pilot.weapons:
      card.type==='passive'?pilot.passives:pilot.dashUpgrades;
    assert.ok(bag[card.id]>=1,`${card.id} must be acquired on this pilot`);
  }
}
assert.equal(Boolean(ghost.passives.phantom_core),true);
assert.equal(Boolean(ghost.dashUpgrades.spectral_extend),true);
assert.equal(Boolean(ghost.weapons.abyssal_possession),true);

// Active spells cost mana and cause real authoritative hits.
assert.equal(ships.runAbility(mage,'onAction',game,'meteor'),true);
assert.ok(hits.some(hit=>hit.owner===mage));
assert.equal(ships.runAbility(mage,'onAction',game,'meteor'),true,'0 CD allows consecutive meteor cast');
while(ships.runAbility(mage,'onAction',game,'meteor')) {}
assert.equal(ships.runAbility(mage,'onAction',game,'meteor'),false,'Mana gate when mana is exhausted');
const position={x:mage.x,y:mage.y};
assert.equal(ships.runAbility(mage,'onAction',game,{kind:'blink',direction:{x:1,y:0}}),true);
assert.ok(mage.x>position.x);
assert.equal(world.window.NeonPilotSystem.startDash(game,mage),true,
  'Remote Astra uses same phase blink, not Riftblade slash');
assert.equal(ships.runAbility(mage,'onAction',game,'ward'),false,
  'Ward shares the finite mana resource with meteor');

// Signature weapons plus all eight Phantom side-weapons produce hits/events.
for(let n=0;n<25;n++){
  game.survivalTime+=.12;
  ships.runAbility(mage,'onTick',game,.12);
  ships.runAbility(ghost,'onTick',game,.12);
}
assert.ok(hits.some(hit=>hit.owner===mage&&hit.source==='astra_weave_bolt'));
assert.ok(hits.some(hit=>hit.owner===ghost), 'Phantom has real attack damage');
for(const id of Object.keys(world.window.NeonPhantomArsenal.RULES)){
  assert.equal(world.window.NeonPhantomArsenal.fire(ghost,game,id,1),true,id);
}
for(let n=0;n<40;n++){
  game.survivalTime+=.1;
  ships.runAbility(ghost,'onTick',game,.1);
}
const ownedSources=new Set(hits.filter(hit=>hit.owner===ghost).map(hit=>hit.source));
for(const source of ['phantom_dart','phantom_orb','phantom_mine',
  'phantom_beam','phantom_clone','phantom_totem','phantom_apocalypse','phantom_possession'])
  assert.ok(ownedSources.has(source),source+' must actually damage enemies');

// Remote Phantom shift marks by passing a target and reaps it, without generic slash.
ghost.x=0;ghost.y=0;ghost.phantom.dashCharges=2;
const charges=ghost.phantom.dashCharges;
assert.equal(world.window.NeonPilotSystem.startDash(game,ghost),true);
assert.equal(ghost.phantom.dashCharges,charges-1);
const near=game.enemies[0];ghost.x=near.x-5;ghost.y=near.y;
ships.runAbility(ghost,'onTick',game,.016);
assert.ok(ghost.phantom.marks.has(near));
assert.equal(world.window.NeonPilotSystem.startDash(game,ghost)>0,true,
  'Second dash detonates the marked enemies');

// Phantom co-op docking is range-limited, host-authoritative and reversible.
ghost.x=20;ghost.y=0;ghost.phantom.shiftActive=false;
assert.equal(ships.runAbility(ghost,'onAction',game,
  {kind:'dock',carrier:game.player}),true);
assert.equal(ghost.phantom.docked,true);
assert.equal(game.player.hasDockedGunner,true);
assert.equal(ships.runAbility(ghost,'onAction',game,
  {kind:'undock',eject:true}),true);
assert.equal(ghost.phantom.docked,false);
assert.equal(game.player.hasDockedGunner,false);
assert.ok(hits.some(hit=>hit.owner===ghost && hit.source==='phantom_reap'));
// A separate teammate's upgrade/mana/ectoplasm can never be mutated by ours.
assert.equal(game.player.weapons.blaster,1);
assert.equal(mage.shipId,'astra');assert.equal(ghost.shipId,'phantom');
assert.equal(ships.projectForNetwork(mage).arcane.maxMana>=100,true);
assert.equal(ships.projectForNetwork(ghost).spectral.maxEctoplasm>=100,true);
console.log('All three playable ships passed: start loadouts, 24 upgrade cards each, two signatures, 8 Phantom extra weapons, spell/dash, co-op docking, distinct owner damage and network projections.');
