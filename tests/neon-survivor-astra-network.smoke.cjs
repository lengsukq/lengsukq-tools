/* Run: node tests/neon-survivor-astra-network.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='public/Game/neon-survivor/js/';
const context={window:{}};
vm.createContext(context);
for (const file of ['network/schema','ships','ships.generated','players','network/snapshots']) {
  vm.runInContext(fs.readFileSync(root+file+'.js','utf8'),context);
}
const snapshots=context.window.NeonLanSnapshots;
const mage={shipId:'astra',x:30,y:-18,hp:95,maxHp:95,level:12,
  astra:{mana:162,maxMana:180,blinkCharges:3,blinkRecharge:2.5,
    cooldowns:{meteor:4.1,ward:11},wardRemaining:2},
  starWeave:{anchors:Array.from({length:50},(_,i)=>({x:i*10,y:i,life:3}))},
  coopShield:{value:13,expiresAt:99},
  junk:{secret:'must never reach network'},hitWindow:new Map([['x',50]])};
const projection=context.window.NeonShips.projectForNetwork(mage).astra;
assert.equal(projection.anchors.length,3,'At most three anchors cross WebRTC');
assert.equal(projection.mana,162);
assert.equal(projection.maxMana,180);
assert.equal(projection.cooldowns.meteor,4.1);
assert.equal(projection.shield,13);
assert.ok(!JSON.stringify(projection).includes('secret'));
assert.ok(!JSON.stringify(projection).includes('hitWindow'));
const pilot=snapshots.serializePilot('guest',mage);
assert.equal(pilot.astra.anchors.length,3);
assert.equal(pilot.shipId,'astra');
assert.equal(context.window.NeonShips.projectForNetwork({shipId:'riftblade'}),null);
const rift=snapshots.serializePilot('host',{shipId:'riftblade',x:0,y:0,hp:100,maxHp:100});
assert.equal(rift.astra,undefined);
assert.equal(JSON.stringify(rift).includes('astra'),false);
mage.astra.mana=999;
mage.astra.cooldowns.meteor=Infinity;
mage.starWeave.anchors[0].x=Infinity;
const clipped=context.window.NeonShips.projectForNetwork(mage).astra;
assert.equal(clipped.mana,250);
assert.equal(clipped.cooldowns.meteor,0);
assert.ok(Number.isFinite(clipped.anchors[0].x));
console.log('Astra network projection passed: bounded mana, independent cooldowns, three anchors and no internal state leaks.');
