/* Run: node tests/neon-survivor-room-roster.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.indexOf('network/roster.js') > 0);
assert.ok(html.indexOf('network/roster.js') < html.indexOf('network/rtc.js'));
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(root + 'js/network/roster.js','utf8'), context);
const { RoomRoster, validCapacity } = context.window.NeonLanRoster;
assert.equal(validCapacity(4), true);
assert.equal(validCapacity(5), false);
for (const capacity of [2,3,4]) {
  const roster = new RoomRoster(capacity);
  assert.equal(roster.size, 1);
  assert.equal(roster.get('host').status, 'connected');
  for (let j=1; j<capacity; j++) {
    const id=roster.reserve();
    assert.equal(id, j===1 ? 'guest' : `guest-${j}`);
    assert.equal(roster.setStatus(id,'connected').status, 'connected');
    assert.equal(roster.get(id).status, 'connected');
  }
  assert.equal(roster.full, true);
  assert.throws(() => roster.reserve(), /full/);
  assert.equal(roster.snapshot().members.length,capacity);
  assert.equal(Object.isFrozen(roster.snapshot().members),true);
  assert.equal(Object.isFrozen(roster.snapshot().members[0]),true);
  const first=roster.get('guest');
  first.status='disconnected';
  assert.equal(roster.get('guest').status,'connected');
  roster.setStatus('guest','disconnected');
  assert.equal(roster.full,true,'Disconnected player still owns their seat');
  assert.throws(() => roster.reserve(), /full/);
  assert.equal(roster.remove('guest'),true);
  assert.equal(roster.reserve(), 'guest','Vacated guest ID becomes reusable');
  assert.throws(() => roster.remove('host'),/Host/);
}
assert.throws(()=>new RoomRoster(1), /2, 3 or 4/);
assert.throws(()=>new RoomRoster(5), /2, 3 or 4/);
assert.throws(()=>new RoomRoster('4'), /2, 3 or 4/);
const room=new RoomRoster(4);
assert.throws(()=>room.reserve('__proto__'),/Invalid guest/);
assert.throws(()=>room.reserve('host'),/Invalid guest/);
assert.throws(()=>room.setStatus('guest','connected'),/Invalid member/);
assert.throws(()=>room.setStatus('host','reserved'),/Host/);
assert.equal(room.reserve('guest-3'),'guest-3');
assert.equal(room.reserve(),'guest');
assert.equal(room.reserve(),'guest-2');
console.log('Room roster passed: 2/3/4 capacity, stable slots, reconnect reservation and immutable public state.');
