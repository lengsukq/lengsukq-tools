/* Run: node tests/neon-survivor-astra-coop-actions.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const calls = [];
const sent = [];
const ships = {
  get(id) { return id === 'astra' ? { id, playable: true } :
    id === 'riftblade' ? { id, playable: true } : null; },
  resolve(id) { return this.get(id) || this.get('riftblade'); },
  runAbility(pilot, hook, world, action) {
    calls.push({pilot,hook,world,action}); return true;
  }
};
const context = {
  window: { NeonShips: ships }, console,
  performance: { now: () => 1000 }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/Game/neon-survivor/js/network/coop.js','utf8'),context);
const Coop = context.window.NeonLanCoop.Coop;
const game = { state:'playing', player:{shipId:'riftblade'}, selectedShipId:'riftblade' };
const rtc = { role:'host', connected:true, send(v) { sent.push(v); return true; } };
const host = new Coop(game,rtc);
host.ally = { shipId:'astra',hp:95,downed:false };
const spell = seq => ({type:'spell_cast',seq,spell:'meteor',damage:999999,
  enemyIds:[1,2,3],playerId:'host'});
host.onMessage(spell(1),'guest');
assert.equal(calls.length,1);
assert.equal(calls[0].pilot,host.ally,
  'Sender-bound request may affect only this guest pilot');
assert.equal(calls[0].action,'meteor');
assert.equal(calls[0].hook,'onAction');
host.onMessage(spell(1),'guest');
assert.equal(calls.length,1,'Replay sequence cannot cast twice');
host.onMessage(spell(2),'guest-2');
assert.equal(calls.length,1,'Unexpected peer cannot control a pilot');
host.onMessage({type:'spell_cast',seq:2,spell:'inject',damage:999999});
assert.equal(calls.length,1,'Invalid spell names are rejected');
game.state='levelup';
host.onMessage(spell(3));
assert.equal(calls.length,1,'Upgrade screen blocks casting');
game.state='playing';
host.ally.downed=true;
host.onMessage(spell(3));
assert.equal(calls.length,1,'Downed pilots cannot cast');
host.ally.downed=false; host.ally.hp=95;
host.onMessage(spell(3));
assert.equal(calls.length,2,'Valid next request is accepted');
host.ally.shipId='riftblade';
host.onMessage(spell(4));
assert.equal(calls.length,2,'Riftblade has no Astra spell interface');
// The local guest sends only a named spell and an input sequence.
const clientRtc = {role:'guest',connected:true,send(v){sent.push(v);return true;}};
const client = new Coop({selectedShipId:'astra'},clientRtc);
client.guestMode=true;
client.latest={phase:'playing',guest:{shipId:'astra',downed:false}};
assert.equal(client.requestGuestSpell('ward'),true);
assert.deepEqual(Object.keys(sent[0]).sort(), ['seq','spell','type']);
assert.equal(sent[0].spell,'ward');
assert.equal(client.requestGuestSpell('inject'),false);
client.latest.phase='paused';
assert.equal(client.requestGuestSpell('meteor'),false);
console.log('Astra LAN action requests passed: sender-bound, sequenced, validated and blocked while paused/downed.');
