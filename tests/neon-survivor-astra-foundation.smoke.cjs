/* Run: node tests/neon-survivor-astra-foundation.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.includes('js/ships.generated.js'));
assert.ok(html.indexOf('js/ships.generated.js') < html.indexOf('js/core.js'));
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'js/ships/astra/abilities.js','utf8'),ctx);
const a = ctx.window.NeonAstra;
const count = type => a.catalog.filter(card => card.type === type);
assert.equal(count('weapon').length, 9);
assert.equal(count('passive').length, 8);
assert.equal(count('dash').length, 7);
assert.equal(a.catalog.length, 24);
assert.equal(new Set(a.catalog.map(card => card.id)).size,24);
assert.equal(a.catalog.find(c => c.id === 'star_weave').maxLvl,5);
assert.equal(a.catalog.find(c => c.id === 'phase_self_guard').maxLvl,2);
assert.ok(a.catalog.every(c => c.shipId === 'astra' &&
  ['common','rare','legendary'].includes(c.rarity)));

const wizard = { shipId:'astra', id:'guest-2', x:0, y:0, hp:95,
  level:1, dmgMultiplier:1 };
const partner = {shipId:'riftblade', id:'host', x:145, y:0, hp:100};
const far = {shipId:'riftblade', id:'guest-3', x:240, y:0, hp:100};
const dead = {shipId:'riftblade', id:'guest-1', x:20, y:10, hp:0, downed:true};
const all = [wizard,partner,far,dead];
const hits=[];
const game={ state:'playing',survivalTime:10, enemies:[], shockwaves:[],
  players:{ list:()=>all.map((state,i)=>({id:'ship-'+i,state})) },
  dealDamage(enemy,damage,source,crit,owner){hits.push({enemy,damage,source,owner});enemy.hp-=damage;}
};
let s=a.state(wizard);
assert.equal(s.mana,60);
assert.equal(s.blinkCharges,2);
assert.equal(a.regenOnHit(wizard,{},10),3);
const one={hp:500};
assert.equal(a.regenOnHit(wizard,one,10),3);
assert.equal(a.regenOnHit(wizard,one,10.3),0,'Same enemy has a 1.5s gain cooldown');
for(let i=0;i<12;i++) a.regenOnHit(wizard, {i}, 10.5);
assert.equal(s.mana,72,'Only 12 energy per simulated second from hits');
game.enemies=Array.from({length:20},(_,i)=>({x:80+i*.1,y:0,hp:1000}));
assert.equal(a.cast(wizard,game,'meteor'),true);
assert.equal(hits.length,12,'Meteor AoE stops at 12 targets');
assert.ok(hits.every(h=>h.owner===wizard&&h.damage===48&&h.source==='astra_meteor'));
assert.equal(s.mana,50,'Meteor spends 22 mana; hit budget is exhausted');
assert.equal(a.cast(wizard,game,'meteor'),false,'Cooldown prevents casting');
assert.equal(s.cooldowns.meteor,3.2);
wizard.level=12;
a.tick(wizard,game,5);
assert.equal(s.talentLevel,3);
assert.equal(s.cooldowns.meteor,0);
assert.equal(s.mana,60);
assert.equal(a.regenOnHit(wizard,one,16),5,'Talent lv3 returns 5 mana per target');
assert.equal(s.mana,65);

// Distinct ward and meteor cooldowns; position-based protection only.
s.mana=100;
assert.equal(a.cast(wizard,game,'ward'),true);
assert.equal(s.mana,40);
assert.equal(s.wardRemaining,5);
assert.equal(a.wardReduction(game,partner),.25);
assert.equal(a.wardReduction(game,far),0);
assert.equal(a.wardReduction(game,dead),0);
assert.equal(s.wardX,0);
assert.equal(s.wardY,0);
wizard.x=500;
assert.equal(a.wardReduction(game,partner),.25,
  'Sanctuary stays where cast rather than following the mage');
assert.equal(a.wardReduction(game,wizard),0,
  'Caster leaving the zone loses its damage reduction');
wizard.x=0;
assert.equal(a.incomingDamage(game,partner,100),75);
assert.equal(a.incomingDamage(game,far,100),100);
assert.equal(a.cast(wizard,game,'ward'),false);

// Phase self-guard never shields teammates; LAN resonance owns all team shields.
s.warpUpgrades.phase_self_guard=1;
assert.equal(a.foldShield(wizard,game,20),1,'Only the blink caster gets a shield');
assert.equal(wizard.astraTempShield.value,12);
assert.equal(partner.astraTempShield,undefined);
assert.equal(far.astraTempShield,undefined);
assert.equal(dead.astraTempShield,undefined);
assert.equal(a.incomingDamage(game,partner,40),30,'Ward reduces damage without inventing a team shield');
assert.equal(a.incomingDamage(game,wizard,40),18,'Ward reduction then self shield absorption');
assert.equal(wizard.astraTempShield,null);
assert.equal(a.foldShield(wizard,game,21),0,'Fold has an independent 6s cooldown');
s.warpUpgrades.phase_self_guard=2;
assert.equal(a.foldShield(wizard,game,26),1,'Tier 2 improves the caster shield only');
assert.equal(wizard.astraTempShield.value,20);
a.tickShields(game,2.6);
assert.equal(wizard.astraTempShield,null,'Temp shield expires after 2.5 seconds');

// Blink uses separate 2→4 charges and never performs Riftblade path slashes.
s.blinkCharges=2;
s.warpUpgrades.star_gate=2;
a.tick(wizard,game,1);
assert.equal(s.blinkCharges,2);
const oldX=wizard.x;
assert.equal(a.blink(wizard,game,{x:1,y:0},31),true);
assert.equal(wizard.x-oldX,160);
assert.equal(wizard.invulnTimer,.12);
assert.equal(s.blinkCharges,1);
assert.equal(a.blink(wizard,game,{x:0,y:0},31),false);
assert.equal(s.blinkCharges,1);
a.tick(wizard,game,5.1);
assert.equal(s.blinkCharges,2);
assert.equal(hits.length,12,'Blink and shields do not produce hidden attacks');
game.state='paused';
const pausedMana=s.mana;
a.tick(wizard,game,20);
assert.equal(s.mana,pausedMana);
assert.equal(a.cast(wizard,game,'meteor'),false);
assert.equal(a.blink(wizard,game,{x:1,y:0},50),false);
assert.equal(a.state(partner),null,'Riftblade never receives Astra mana state');
console.log('Astra headless foundation passed: 9/8/7 scoped definitions, energy, spells, shields, blink, team ranges and pause safety.');
