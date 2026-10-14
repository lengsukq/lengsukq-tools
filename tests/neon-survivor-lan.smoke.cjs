/* Run: node tests/neon-survivor-lan.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
for (const file of ['rtc', 'coop', 'ui']) {
  assert.ok(html.includes('js/network/' + file + '.js'), file + ' must be loaded');
}
assert.match(html, /id="btn-lan-coop"/);
class FakeBroadcastChannel {
  static channels = [];
  constructor(name) { this.name = name; this.messages = []; FakeBroadcastChannel.channels.push(this); }
  postMessage(data) {
    this.messages.push(data);
    for (const channel of FakeBroadcastChannel.channels) {
      if (channel !== this && channel.name === this.name) channel.onmessage?.({ data });
    }
  }
  close() { FakeBroadcastChannel.channels = FakeBroadcastChannel.channels.filter(ch => ch !== this); }
}
class FakePeerConnection {
  constructor() {
    this.iceGatheringState = 'complete';
    this.connectionState = 'new';
    this.closed = false;
    this.events = {};
  }
  createDataChannel(name) {
    this.channel = {
      name, readyState: 'open', bufferedAmount: 0,
      sent: [], send(data) { this.sent.push(data); },
      close() { this.readyState = 'closed'; }
    };
    return this.channel;
  }
  createOffer() { return Promise.resolve({ type: 'offer', sdp: 'a=fake:offer' }); }
  createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'a=fake:answer' }); }
  setLocalDescription(desc) { this.localDescription = desc; return Promise.resolve(); }
  setRemoteDescription(desc) { this.remoteDescription = desc; return Promise.resolve(); }
  addEventListener(name, fn) { this.events[name] = fn; }
  removeEventListener(name) { delete this.events[name]; }
  close() { this.closed = true; this.connectionState = 'closed'; }
}
const sandbox = {
  window: {},
  BroadcastChannel: FakeBroadcastChannel,
  RTCPeerConnection: FakePeerConnection,
  crypto: { getRandomValues(bytes) {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (counter++ % 30) + 1;
    return bytes;
  } },
  console, Math, JSON,
  performance: { now: () => 500 },
  setTimeout, clearTimeout,
  navigator: { getGamepads: () => [] }
};
let counter = 0;
vm.createContext(sandbox);
// The shared PilotSpeed model lives in core (a later classic script in the
// page); pilots.js calls it at run time.
vm.runInContext(fs.readFileSync(root + 'js/core/simulation/speed.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(root + 'js/combat/pilots.js', 'utf8'), sandbox);
for (const script of ['rtc', 'coop']) {
  vm.runInContext(fs.readFileSync(root + 'js/network/' + script + '.js', 'utf8'), sandbox);
}
const { LanRTC, parseSignal } = sandbox.window.NeonLanRTC;
const { Coop, normalizeInput, snapshot, safeSnapshot } = sandbox.window.NeonLanCoop;

assert.throws(() => parseSignal('{'), /有效 JSON/);
assert.throws(() => parseSignal(JSON.stringify({ version: 1, room: 'A', kind: 'offer' })), /格式/);
assert.throws(() => parseSignal('x'.repeat(13000)), /过长/);
assert.equal(normalizeInput({ type: 'input', seq: 2, dx: 4, dy: 0, aim: 0 }).dx, 1);
assert.equal(normalizeInput({ type: 'input', seq: 2, dx: Infinity, dy: 0, aim: 0 }), null);
assert.equal(normalizeInput({ type: 'input', seq: -1, dx: 0, dy: 0, aim: 0 }), null);

(async () => {
  const host = new LanRTC();
  const guest = new LanRTC();
  const code = host.host();
  assert.equal(code.length, 6);
  let discovered = [];
  guest.onRooms = r => { discovered = r; };
  guest.discover();
  assert.equal(discovered.length, 1, 'BroadcastChannel discovers same-browser hosted room');
  assert.equal(discovered[0].room, code);
  assert.equal(FakeBroadcastChannel.channels.length, 2);
  const offer = await host.makeOffer();
  const parsed = parseSignal(offer);
  assert.equal(parsed.kind, 'offer');
  assert.equal(parsed.room, code);
  const answer = await guest.acceptOffer(offer);
  assert.equal(parseSignal(answer).kind, 'answer');
  await host.acceptAnswer(answer);
  assert.equal(host.peer.remoteDescription.type, 'answer');
  assert.equal(guest.peer.remoteDescription.type, 'offer');
  assert.equal(host.send({ type: 'ping' }), true);
  assert.equal(JSON.parse(host.channel.sent[0]).type, 'ping');
  host.channel.bufferedAmount = 120000;
  assert.equal(host.send({ type: 'ping' }), false, 'Backpressure protects the room');
  host.close(); guest.close();
  assert.equal(FakeBroadcastChannel.channels.length, 0, 'Rooms removed on close');

  // Same-browser discovery automatically relays ICE-complete offer and answer.
  const autoHost = new LanRTC();
  const autoGuest = new LanRTC();
  const autoCode = autoHost.host();
  let available = [];
  autoGuest.onRooms = rooms => { available = rooms; };
  autoGuest.discover();
  assert.equal(available[0].room, autoCode);
  autoGuest.joinDiscovered(autoCode, available[0].from);
  await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(autoGuest.peer?.remoteDescription?.type, 'offer');
  assert.equal(autoHost.peer?.remoteDescription?.type, 'answer',
    'Local browser discovery should complete signaling without copy/paste');
  autoHost.close(); autoGuest.close();

  const game = {
    state: 'playing', endlessMode: false, survivalTime: 12, kills: 3,
    player: { x: 0, y: 0, hp: 100, maxHp: 100, aimAngle: 0, level: 4 },
    enemies: [{ x: 125, y: 0, hp: 200, maxHp: 200, radius: 12, damage: 5, color: '#ff0' }],
    bullets: [], enemyBullets: [], gems: [],
    keys: {}, touch: { active: false },
    dealDamage(enemy, damage) { enemy.hp -= damage; }
  };
  const hostSent = [];
  const hostConn = { role: 'host', connected: true, send(data) { hostSent.push(data); return true; } };
  const h = new Coop(game, hostConn);
  h.startHost();
  const input = { type: 'input', seq: 1, dx: 1, dy: 0, aim: 0, dash: true };
  h.onMessage(input);
  h.updateHost(0.12);
  assert.ok(h.ally.x > 60, 'Remote ship moves inside host authority');
  assert.equal(h.ally.charges, 2, 'One dash charge consumed by remote input');
  assert.ok(hostSent.length > 0);
  assert.equal(safeSnapshot(hostSent[0]), true);
  assert.equal(hostSent[0].enemies[0].hp, game.enemies[0].hp);
  const x = h.ally.x;
  h.onMessage({ ...input, dx: -1 });
  assert.equal(h.ally.input.dx, 1, 'Duplicate sequence ignored');
  h.onMessage({ ...input, seq: 2, dx: -1, dash: false });
  h.updateHost(0.1);
  assert.ok(h.ally.x < x, 'New input sequence takes effect');
  game.state = 'levelup';
  h.updateHost(0.25);
  assert.equal(hostSent.at(-1).phase, 'levelup', 'Pauses and upgrades must sync to guest');
  game.state = 'playing';

  const clientSent = [];
  const clientConn = { role: 'guest', connected: true, send(data) { clientSent.push(data); return true; } };
  const c = new Coop(game, clientConn);
  c.guestMode = true;
  c.onMessage(hostSent[0]);
  assert.equal(c.latest.seq, 0);
  c.onMessage({ ...hostSent[0], seq: -1 });
  assert.equal(c.latest.seq, 0, 'Stale snapshot ignored');
  c.updateGuest(0.06);
  assert.equal(clientSent[0].type, 'input');
  assert.equal(clientSent[0].seq, 0);
  console.log('Neon Survivor LAN passed: SDP exchange, browser discovery, authoritative snapshots, input sequence, dash and backpressure.');
})().catch(e => { console.error(e); process.exitCode = 1; });
