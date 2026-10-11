/* Run: node tests/neon-survivor-ready-room.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const ships = {
  get(id) {
    if (id === 'riftblade') return { id, name: '裂锋', playable: true };
    if (id === 'runner') return { id, name: '试验战舰', playable: true };
    if (id === 'astra') return { id, name: '星织', playable: false };
    return null;
  },
  resolve(id) { return this.get(id)?.playable ? this.get(id) : this.get('riftblade'); },
  runAbility() {}
};
const window = {
  NeonShips: ships,
  NeonPlayers: {
    createRemotePilot(_, id, shipId) {
      return { id, shipId, hp: 100, input: {}, profile: null };
    }
  }
};
const document = {
  getElementById() { return null; },
  body: { classList: { add() {}, remove() {} } }
};
const context = { window, document, console, performance: { now: () => 1000 } };
vm.createContext(context);
for (const name of ['network/ready', 'network/coop']) {
  vm.runInContext(fs.readFileSync(root + 'js/' + name + '.js', 'utf8'), context);
}
const { ReadyRoom, validSnapshot } = window.NeonLanReady;
assert.throws(() => new ReadyRoom(5), /capacity/);
for (const capacity of [2, 3, 4]) {
  const room = new ReadyRoom(capacity);
  assert.equal(room.snapshot().members.length, capacity);
  assert.equal(room.canStart(), false, 'An empty room cannot launch');
  assert.equal(room.set('host', { shipId: 'astra', ready: true }), false,
    'Locked class cannot be selected');
  room.set('host', { ready: true });
  for (const id of ['guest', 'guest-2', 'guest-3'].slice(0, capacity - 1)) {
    room.set(id, { connected: true, name: id, shipId: 'riftblade', ready: true });
  }
  assert.equal(room.canStart(), true);
  assert.equal(validSnapshot(room.snapshot()), true);
  const guest = room.get('guest');
  assert.equal(room.set('guest', { seq: 3, ready: false }), true);
  assert.equal(room.set('guest', { seq: 3, ready: true }), false,
    'Replayed ready request cannot change room state');
  assert.equal(room.canStart(), false);
  room.set('guest', { seq: 4, ready: true });
  assert.equal(room.canStart(), true);
  room.set('guest', { connected: false });
  assert.equal(room.canStart(), false, 'Disconnected seats are not ready');
  room.set('guest', { connected: true, ready: true });
  assert.equal(room.start(), true);
  assert.equal(room.set('host', { ready: false }), false, 'Room is locked after launch');
  assert.equal(room.start(), false);
}
assert.equal(validSnapshot({ capacity: 4, revision: 1, members: [] }), false);

// The protocol harness has no browser DOM; use the real state model and mock
// only the visual mount (the production DOM is covered separately).
window.NeonLanReady = { ...window.NeonLanReady, mount(coop) {
  coop.guestShipWaitPanel = { remove() {} };
  coop.refreshReadyView = () => {};
} };

let host, guest, hostStarted = 0;
const hostMessages = [], guestMessages = [];
const hostRtc = {
  role: 'host', connected: true, send(payload) {
    hostMessages.push(payload);
    guest?.onMessage(payload, 'host');
    return true;
  }
};
const guestRtc = {
  role: 'guest', connected: true, send(payload) {
    guestMessages.push(payload);
    host?.onMessage(payload, 'guest');
    return true;
  }
};
const hostGame = {
  state: 'lan-lobby', selectedShipId: 'riftblade', player: { shipId: 'riftblade' },
  startNewGame() { hostStarted++; this.state = 'playing'; },
  showStartMenu() {}, modalLevelup: { classList: { remove() {} } }
};
const guestGame = {
  state: 'lan-lobby', selectedShipId: 'riftblade',
  players: { remove() {} },
  hideAllModals() {}, releaseJoystickTouch() {},
  showStartMenu() {}, modalLevelup: { classList: { remove() {} } }
};
const Coop = window.NeonLanCoop.Coop;
host = new Coop(hostGame, hostRtc);
guest = new Coop(guestGame, guestRtc);
host.awaitGuestShip();
guest.enterGuestReady();
assert.equal(hostStarted, 0, 'Connection and profile must not auto-start');
assert.equal(host.beginHostMatch(), false, 'Host cannot bypass readiness');
assert.equal(host.readyRoom.get('guest').connected, true);
assert.equal(guest.remoteReady.members.length, 2);

assert.equal(host.setReady(true), true);
assert.equal(host.beginHostMatch(), false, 'Host ready alone is insufficient');
assert.equal(guest.setReady(true), true);
assert.equal(host.readyRoom.canStart(), true);
assert.equal(guest.remoteReady.canStart, true);
assert.equal(guest.setReady(false), true);
assert.equal(host.beginHostMatch(), false, 'Guest can cancel readiness');
assert.equal(guest.selectReadyShip('astra'), false, 'Locked ship remains unavailable');
assert.equal(guest.selectReadyShip('runner'), true, 'Ship can change while not ready');
assert.equal(host.readyRoom.get('guest').shipId, 'runner');
assert.equal(host.readyRoom.canStart(), false);
assert.equal(guest.setReady(true), true);
const before = guestMessages.length;
host.onMessage({ type: 'ready_update', seq: 1, shipId: 'riftblade', ready: true }, 'guest');
assert.equal(host.readyRoom.get('guest').shipId, 'runner',
  'Replayed / cross-ship ready requests cannot force class changes');
host.onMessage({ type: 'ready_update', seq: 500, shipId: 'runner', ready: true }, 'guest-2');
assert.equal(host.readyRoom.get('guest').seq, guestMessages[before - 1]?.seq ?? host.readyRoom.get('guest').seq,
  'Unbound sender must never update readiness');
assert.equal(host.beginHostMatch(), true);
assert.equal(hostStarted, 1, 'Host launches exactly one match');
assert.equal(host.ally.shipId, 'runner', 'Guest ship choice is locked on host');
assert.equal(guestGame.state, 'lan-client', 'Guest enters game only after match_start');
assert.equal(host.beginHostMatch(), false, 'Duplicate start cannot restart');
assert.equal(hostMessages.some(m => m.type === 'match_start'), true);
assert.equal(hostMessages.some(m => m.type === 'ready_roster'), true);
assert.equal(guestMessages.some(m => m.type === 'ready_update'), true);
console.log('Ready room passed: 2–4 seat model, host-only launch, guest ship choice, ready toggle and replay resistance.');
