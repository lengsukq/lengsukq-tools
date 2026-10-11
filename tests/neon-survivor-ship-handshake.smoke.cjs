/* Run: node tests/neon-survivor-ship-handshake.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const shown = [];
const shipDefs = {
  riftblade: { id:'riftblade', playable:true },
  astra: { id:'astra', playable:true }, // Test metadata simulates future unlock.
  phantom: { id:'phantom', playable:false }
};
const window = {
  NeonShips: {
    get(id) { return shipDefs[id] || null; },
    resolve(id) { return shipDefs[id]?.playable ? shipDefs[id] : shipDefs.riftblade; },
    runAbility() {}
  },
  NeonPlayers: {
    createRemotePilot(_, id, shipId) {
      return { id, shipId, hp:shipId === 'astra' ? 95 : 100,
        weapons:shipId === 'astra' ? {star_weave:1} : {blaster:1} };
    }
  }
};
const document = { getElementById() { return null; }, body:{classList:{remove(){}}} };
const sandbox = {window, document, performance:{now:()=>1000}, console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root+'network/ready.js','utf8'),sandbox);
window.NeonLanReady = { ...window.NeonLanReady, mount(coop) {
  const node = {remove(){this.removed=true;}};
  shown.push(node);
  coop.guestShipWaitPanel=node;
  coop.refreshReadyView=()=>{};
} };
vm.runInContext(fs.readFileSync(root+'network/coop.js','utf8'),sandbox);
const Coop=window.NeonLanCoop.Coop;
function prepare() {
  const game={state:'menu',player:{shipId:'riftblade'},selectedShipId:'riftblade',
    starts:0,startNewGame(){this.starts++;this.state='playing';},
    showStartMenu(){this.state='start';}};
  const packets=[];
  const rtc={connected:true,role:'host',send(packet){packets.push(packet);return true;}};
  const coop=new Coop(game,rtc);
  return {game,coop,packets};
}
const {game,coop,packets}=prepare();
assert.equal(coop.awaitGuestShip(),true);
assert.equal(game.starts,0,'Connection must not automatically start');
coop.onMessage({type:'profile',name:'mage',shipId:'astra'},'guest');
assert.equal(game.starts,0,'Even after ship negotiation, both players must ready');
assert.equal(coop.pendingGuestShipId,'astra');
assert.equal(coop.beginHostMatch(),false,'Manual start is guarded');
coop.setReady(true);
assert.equal(coop.beginHostMatch(),false,'Host ready is not enough');
coop.onMessage({type:'ready_update',shipId:'astra',ready:true,seq:0},'guest');
assert.equal(coop.beginHostMatch(),true);
assert.equal(game.starts,1);
assert.equal(coop.ally.shipId,'astra');
assert.equal(coop.ally.weapons.star_weave,1);
assert.equal(packets.some(packet=>packet.type==='match_start'),true);
assert.ok(shown[0].removed,'Ready overlay disappears on launch');
coop.onMessage({type:'profile',name:'sabotage',shipId:'riftblade'},'guest');
assert.equal(coop.ally.shipId,'astra','Late profile cannot change a started game');
assert.equal(coop.beginHostMatch(),false,'Duplicate start is rejected');

const legacy=prepare();
legacy.coop.awaitGuestShip();
legacy.coop.onMessage({type:'profile',name:'legacy'},'guest');
assert.equal(legacy.game.starts,0,'Old clients cannot bypass readiness');
legacy.coop.setReady(true);
legacy.coop.onMessage({type:'ready_update',shipId:'riftblade',ready:true,seq:0},'guest');
legacy.coop.beginHostMatch();
assert.equal(legacy.coop.ally.shipId,'riftblade');
const invalid=prepare();
invalid.coop.awaitGuestShip();
invalid.coop.onMessage({type:'profile',shipId:'phantom'},'guest');
assert.equal(invalid.coop.pendingGuestShipId,'riftblade',
  'Locked ships fall back to Riftblade but never auto-start');
const early=prepare();
early.coop.onMessage({type:'profile',shipId:'astra'},'guest');
early.coop.awaitGuestShip();
assert.equal(early.game.starts,0);
assert.equal(early.coop.readyRoom.get('guest').shipId,'astra');
const wrongPeer=prepare();
wrongPeer.coop.awaitGuestShip();
wrongPeer.coop.onMessage({type:'profile',shipId:'astra'},'guest-2');
assert.equal(wrongPeer.coop.readyRoom.get('guest').connected,false);
wrongPeer.coop.stop();
assert.equal(wrongPeer.game.state,'start','Disconnect returns to start');
assert.ok(shown.at(-1).removed,'Disconnect cleans up ready overlay');
console.log('Ship handshake passed: pre-match class lock, all-ready gate, fallback and replay protection.');
