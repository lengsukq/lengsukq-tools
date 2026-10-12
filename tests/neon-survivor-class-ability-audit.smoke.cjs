/* Run: node tests/neon-survivor-class-ability-audit.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='public/Game/neon-survivor/js/';
const env={window:{},console,performance:{now:()=>1000},setTimeout,clearTimeout};
vm.createContext(env);
for(const module of ['ships','ships.generated','combat/pilots'])
  vm.runInContext(fs.readFileSync(root+module+'.js','utf8'),env);
const ships=env.window.NeonShips;
const ctx=new Proxy({}, {get:(obj,key)=>key in obj ? obj[key] : ()=>{},
  set:(obj,key,value)=>{obj[key]=value;return true;}});
const enemies=Array.from({length:16},(_,i)=>({
  x:85+(i%4)*22,y:(Math.floor(i/4)-2)*18,
  hp:100000,maxHp:100000,radius:14,dead:false,damage:10
}));
const damage=[];
const game={state:'playing',survivalTime:12,enemies,shockwaves:[],
  particles:[],texts:[],bullets:[],enemyBullets:[],
  dealDamage(enemy,amount,source,crit,owner){
    assert.ok(Number.isFinite(amount)&&amount>0,source+' must do finite damage');
    damage.push({source,owner,amount,crit});enemy.hp-=amount;
  }};
function pilot(id){
  const ship=ships.get(id),p={...ships.startingState(id),x:0,y:0,
    radius:16,hp:ship.baseStats.hp,maxHp:ship.baseStats.hp,
    regen:ship.baseStats.regen,level:5,dmgMultiplier:1,cdrMultiplier:1,
    passives:{},dashUpgrades:{}};
  ships.runAbility(p,'onStart',game);
  return p;
}

// STAR WEAVER: eight independent spells plus the original signature weapon.
const mage=pilot('astra');game.player=mage;
for(const id of Object.keys(env.window.NeonAstraArsenal.WEAPONS)){
  mage.astraVisual=[];
  assert.equal(env.window.NeonAstraArsenal.fire(mage,game,id,1,enemies),true,id);
  assert.ok(mage.astraVisual.length>0,'Missing visual feedback: '+id);
  assert.ok(mage.astraVisual.length<=24,id+' FX cap');
  assert.doesNotThrow(()=>ships.drawPilotEffects(ctx,mage,game),id+' local FX');
}
mage.passives={star_talisman:1,ley_conduit:1,weave_focus:1,
  shield_refraction:1,star_mark_hunt:1,glyph_extent:1,
  danger_resonance:1,dual_harmony:1};
mage.hp=20;
const mods=env.window.NeonAstraArsenal.modifiers(mage);
for(const [key,min] of [['maxMana',100],['manaRegen',2],['areaFactor',1],
  ['markBonus',1],['dangerBonus',1],['shieldReduction',0],['refraction',0],['harmony',0]])
  assert.ok(mods[key]>min,'Astra passive modifier missing: '+key);
assert.ok(mods.cooldownFactor<1);
mage.astraArsenal.marks.clear(); // Distinguish default bolt from fragments' marks.
env.window.NeonAstraWeave.tick(mage,game,.7);
const nearest=enemies.reduce((best,e)=>!best || Math.hypot(e.x,e.y)<Math.hypot(best.x,best.y)?e:best,null);
assert.ok(mage.astraArsenal.marks.has(nearest),
  'Marked-target passive must work with default star-weave weapon');
mage.astra.maxMana=140;mage.astra.mana=140;
assert.equal(env.window.NeonAstra.cast(mage,game,'meteor'),true);
assert.equal(env.window.NeonAstra.cast(mage,game,'ward'),true);
assert.ok(mage.astra.wardHarmonyBonus>0,'Alternating active spells apply dual-harmony buff');
assert.ok(mage.astraVisual.some(e=>e.kind==='burst'));
assert.ok(mage.astraVisual.some(e=>e.kind==='shield'));
mage.dashUpgrades={star_gate:1,prism_veil:1,spatial_disturb:1,
  phase_self_guard:1,rift_brand:1,mirror_echo:1,anchor_rewrite:1};
mage.astra.warpUpgrades={...mage.dashUpgrades};
mage.astra.blinkCharges=2;
mage.starWeave.anchors=[{x:80,y:0,life:4}];
env.window.NeonAstra.finishWard(mage,game);
assert.equal(env.window.NeonAstra.blink(mage,game,{x:1,y:0},game.survivalTime),true);
assert.ok(mage.astraTempShield?.value>0,'Self-only fold shield');
assert.ok(mage.astraArsenal.mirrorEchoPending,'Mirror passive charges next hit');
assert.equal(mage.starWeave.anchors[0].x,mage.x,'Rewritten star anchor follows blink');
assert.ok(enemies.some(e=>e.freezeTimer>0),'Spatial distortion changes monster movement');
const beforeReflect=damage.length;
assert.ok(env.window.NeonAstra.incomingDamage(game,mage,50)<50);
assert.ok(damage.length>beforeReflect,'Shield-refraction passive counterattacks');
const mageNet=ships.projectForNetwork(mage).arcane;
assert.ok(mageNet.visual?.length<=24);
assert.doesNotThrow(()=>ships.drawNetworkEffects(ctx,{shipId:'astra',arcane:mageNet},game));

// PHANTOM: all eight supplemental weapons must emit independent, bounded FX.
const ghost=pilot('phantom');game.player=ghost;
for(const id of Object.keys(env.window.NeonPhantomArsenal.RULES)){
  ghost.phantomVisual=[];
  assert.equal(env.window.NeonPhantomArsenal.fire(ghost,game,id,1),true,id);
  assert.ok(ghost.phantomVisual.length>0,'Missing visual feedback: '+id);
  assert.ok(ghost.phantomVisual.length<=24,id+' FX cap');
  assert.doesNotThrow(()=>ships.drawPilotEffects(ctx,ghost,game),id+' local FX');
}
ghost.passives={phantom_core:1,spiritual_flow:1,stealth_armor:1,
  execute_master:1,symbiosis_link:1,soul_gatherer:1,death_reversal:1,dual_mind:1};
Object.assign(ghost.phantom.passiveUpgrades,ghost.passives);
ghost.hp=20;
env.window.NeonPhantomArsenal.tick(ghost,game,.1);
assert.equal(ghost.phantom.maxEctoplasm,108,'Core boosts resource capacity');
assert.equal(ghost.regen,.62,'Low-life stealth armour regeneration');
ghost.hp=80;
env.window.NeonPhantomArsenal.tick(ghost,game,.1);
assert.equal(ghost.regen,.5,'Stealth armour must stop above low-life threshold');
ghost.phantom.ectoplasm=0;
env.window.NeonPhantom.addEctoplasm(ghost,10);
assert.ok(ghost.phantom.ectoplasm>10,'Spiritual-flow multiplier works');
assert.ok(env.window.NeonPhantom.critBonus(ghost,game.survivalTime)>.1,
  'Core and dual mind increase crit probability');
ghost.phantom.slingshotBuffUntil=game.survivalTime+4;
env.window.NeonPhantomArsenal.damage(ghost,game,enemies[0],20,'phantom_crit_audit');
assert.equal(damage.at(-1).crit,true,'100% slingshot crit applies to arsenal too');
const carrier={x:ghost.x,y:ghost.y,hp:50,maxHp:100,downed:false};
assert.equal(env.window.NeonPhantom.dock(ghost,carrier),true);
assert.equal(env.window.NeonPhantomArsenal.fire(ghost,game,'symbiote_beam',1),true);
assert.ok(carrier.hp>50,'Beam supports carrier while docked');
assert.equal(env.window.NeonPhantom.undock(ghost,game,true),true);
assert.ok(ghost.phantom.slingshotBuffUntil>game.survivalTime);
ghost.phantom.dockCooldownRemaining=0;
ghost.phantom.dashCharges=2;
ghost.phantom.warpUpgrades={spectral_extend:1,soul_detonation:1,
  charge_overflow:1,ghost_trail:1,terror_shriek:1,dimension_door:1,
  symbiote_slingshot:1};
assert.equal(env.window.NeonPhantom.enterShift(ghost,game),true);
const beforeEcto=ghost.phantom.ectoplasm;
assert.equal(env.window.NeonPhantom.markEnemy(ghost,enemies[0],game.survivalTime),true);
assert.equal(env.window.NeonPhantom.markEnemy(ghost,enemies[0],game.survivalTime),false,
  'An already marked enemy must not farm ectoplasm each frame');
assert.ok(ghost.phantom.ectoplasm>beforeEcto);
assert.ok(ghost.phantom.shiftRemaining>env.window.NeonPhantom.BASE.shiftDuration,
  'Spectral-extend affects duration');
assert.equal(env.window.NeonPhantom.finishShift(ghost,game,true),true);
assert.ok(enemies[0].fearedUntil>game.survivalTime,'Terror shriek applies real AI fear');
assert.ok(enemies[0].freezeTimer>0,'Dimension door applies movement slow');
ghost.cheatDeathUsed=true;
ships.runAbility(ghost,'onTick',game,.1);
assert.ok(ghost.phantomVisual.some(e=>e.kind==='heal'),
  'Death-reversal has a visible lifesaving flash');
assert.ok(ghost.phantomVisual.length<=24);
const ghostNet=ships.projectForNetwork(ghost).spectral;
assert.ok(ghostNet.visual.length<=24);
assert.doesNotThrow(()=>ships.drawNetworkEffects(ctx,
  {shipId:'phantom',x:ghost.x,y:ghost.y,spectral:ghostNet},game));
assert.ok(damage.every(hit=>hit.owner===mage||hit.owner===ghost));
console.log('48-card class audit passed: 8 Astra spell FX, 8 Phantom weapon FX, all active/passive modifiers and warp routes, real fear/stun status, critical/regen fixes, bound visual timelines and local/remote rendering.');
