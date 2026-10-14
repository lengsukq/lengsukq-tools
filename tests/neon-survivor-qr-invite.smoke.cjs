/* Run: node tests/neon-survivor-qr-invite.smoke.cjs
 * Tests URL safety and the host -> scan -> auto-join UI without Redis access.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const css = fs.readFileSync(root + 'css/game.css', 'utf8');
const core = neonCore.coreSource();
assert.ok(html.indexOf('network/qrcode.min.js') < html.indexOf('network/invite.js'));
assert.ok(html.indexOf('network/invite.js') < html.indexOf('network/ui.js'));
assert.match(css, /\.neon-lan-qr-panel\[hidden\]\s*\{\s*display:\s*none/);
assert.match(core, /NeonLanInvite\?\.parse\(window\.location\?\.href\)/);

class Node {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.isConnected = false;
    this.classList = { add() {}, remove() {}, contains() { return false; } };
  }
  append(...children) { for (const child of children) this.appendChild(child); }
  appendChild(child) {
    this.children.push(child);
    this.assignConnected(child, this.isConnected);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    this.assignConnected(child, false);
    return child;
  }
  replaceChildren(...children) {
    for (const child of this.children) this.assignConnected(child, false);
    this.children = [];
    this.append(...children);
  }
  assignConnected(node, connected) {
    node.isConnected = connected;
    for (const child of node.children) this.assignConnected(child, connected);
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  remove() { this.isConnected = false; }
  // The lobby attaches a keydown handler, focuses the room-code field and
  // selects it before copying. The mock only needs these to exist.
  addEventListener() {}
  removeEventListener() {}
  focus() {}
  select() {}
  click() {}
}
function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
function environment(url, { failJoin = false } = {}) {
  const calls = { create: 0, join: [], qr: [], copies: [], closed: 0 };
  const document = {
    body: new Node('body'),
    createElement(tag) { return new Node(tag); },
    getElementById(id) { return find(this.body, node => node.id === id); },
    // The in-game leave button prefers the HUD container; falling back to body
    // is the documented behaviour when the HUD is absent.
    querySelector() { return null; }
  };
  document.body.isConnected = true;
  class FakeRTC {
    constructor() { this.role = null; this.room = null; this.connected = false; }
    close() {}
  }
  class FakeCoop {
    constructor() {}
    stop() {}
  }
  class FakeSignal {
    constructor(cb) {
      this.callback = cb; this.room = null; this.hostToken = null;
      calls.signal = this;
    }
    async create(rtc) {
      calls.create++;
      rtc.role = 'host';
      rtc.room = 'AB7K92';
      this.room = rtc.room;
      this.hostToken = 'private-host-token';
      this.callback('房间已创建');
      return this.room;
    }
    async join(rtc, room) {
      calls.join.push(room);
      if (failJoin && calls.join.length === 1) throw Error('房间已过期');
      rtc.role = 'guest';
      rtc.room = room;
      return room;
    }
    close() { calls.closed++; return Promise.resolve(); }
  }
  class QRCode {
    constructor(target, options) {
      calls.qr.push(options.text);
      target.appendChild(new Node('canvas'));
    }
  }
  QRCode.CorrectLevel = { M: 0 };
  const location = new URL(url);
  const win = {
    location: { href: location.toString(), origin: location.origin },
    NeonLanRTC: { LanRTC: FakeRTC },
    NeonLanCoop: { Coop: FakeCoop },
    NeonLanSignaling: { RoomSignaling: FakeSignal },
    NeonLanTeammates: { ownProfile() { return { name: '测试玩家', color: '#00f3ff' }; } },
    NeonGameSettings: { open() {} },
    QRCode
  };
  const navigator = { clipboard: { async writeText(value) { calls.copies.push(value); } } };
  const sandbox = { window: win, document, navigator, URL, console, Promise };
  vm.createContext(sandbox);
  for (const file of ['network/invite.js', 'network/ui.js']) {
    vm.runInContext(fs.readFileSync(root + 'js/' + file, 'utf8'), sandbox);
  }
  const game = { state: 'start', lanRTC: null, lanCoop: null,
    sound: { init() {} }, startNewGame() {}, showStartMenu() {} };
  return { calls, window: win, document, game };
}
async function main() {
  const host = environment('https://game.example/Game/neon-survivor/index.html?perf=1');
  const invite = host.window.NeonLanInvite;
  const expected = 'https://game.example/Game/neon-survivor/index.html?lanRoom=AB7K92&lanAutoJoin=1';
  assert.equal(invite.build('ab7k92', 'https://game.example'), expected);
  assert.deepEqual(JSON.parse(JSON.stringify(invite.parse(expected))),
    { room: 'AB7K92', autoJoin: true });
  assert.equal(invite.parse(expected.replace('lanRoom=AB7K92', 'lanRoom=ABC')), null);
  assert.equal(invite.parse(expected + '&lanRoom=ZZZZZZ'), null);
  assert.equal(invite.parse('javascript:alert(1)'), null);
  assert.equal(invite.parse(expected.replace('/Game/neon-survivor/', '/else/')), null);
  assert.equal(invite.parse('https://game.example/Game/neon-survivor/index.html?lanRoom=AB7K92').autoJoin,
    false, 'Old shared links still fill the room code without forced joining');

  host.window.NeonLanLobby.open(host.game);
  const create = find(host.document.body, node => node.textContent === '创建房间');
  const qrPanel = find(host.document.body, node => node.className === 'neon-lan-qr-panel');
  assert.ok(create && qrPanel && qrPanel.hidden);
  await create.onclick();
  assert.equal(host.calls.create, 1);
  assert.equal(qrPanel.hidden, false);
  assert.equal(host.calls.qr[0], expected);
  assert.ok(!host.calls.qr[0].includes('private-host-token'),
    'QR must NEVER expose host secret tokens');
  const copy = find(host.document.body, node => node.textContent === '复制邀请链接');
  await copy.onclick();
  assert.equal(host.calls.copies[0], expected,
    'Copy link must point to the same auto-join URL as the QR');
  host.calls.signal.onExpired();
  assert.equal(qrPanel.hidden, true, 'Expired rooms must stop displaying stale QR codes');
  assert.match(find(host.document.body, node => node.tag === 'strong' &&
    node.textContent.includes('房间已过期')).textContent, /重新创建/);

  // Exercise the real bundled QRCode.js encoder (DOM table drawing fallback
  // used by browsers without a Canvas implementation).
  const encodedQr = { title: '', innerHTML: '', childNodes: [
    { offsetWidth: 200, offsetHeight: 200, style: {} }
  ] };
  const qrBrowser = {
    navigator: { userAgent: 'Chrome' },
    document: { documentElement: { tagName: 'HTML' }, getElementById: () => null },
    console
  };
  vm.createContext(qrBrowser);
  let actualQr;
  try {
    vm.runInContext(fs.readFileSync(root + 'js/network/qrcode.min.js', 'utf8'), qrBrowser);
    actualQr = new qrBrowser.QRCode(encodedQr, {
      text: expected, width: 200, height: 200,
      colorDark: '#061b29', colorLight: '#ffffff',
      correctLevel: qrBrowser.QRCode.CorrectLevel.M
    });
  } catch (error) {
    throw Error('Bundled QR library failed to encode the invite: ' + error.message);
  }
  assert.equal(encodedQr.title, expected);
  assert.ok(actualQr._oQRCode.getModuleCount() >= 21);
  assert.match(encodedQr.innerHTML, /<table/);
  assert.match(encodedQr.innerHTML, /background-color:#061b29/);
  assert.match(encodedQr.innerHTML, /background-color:#ffffff/);

  const guest = environment(expected);
  const guestInvite = guest.window.NeonLanInvite.parse(guest.window.location.href);
  const lobby = guest.window.NeonLanLobby.open(guest.game, {
    roomCode: guestInvite.room, autoJoin: guestInvite.autoJoin
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(guest.calls.join.length, 1, 'Camera scan must trigger exactly one join');
  assert.equal(guest.calls.join[0], 'AB7K92');
  assert.equal(find(guest.document.body, node => node.className === 'neon-lan-code-input').value,
    'AB7K92');
  assert.equal(lobby.ui.isConnected, true);

  const expired = environment(expected, { failJoin: true });
  expired.window.NeonLanLobby.open(expired.game, { roomCode: 'AB7K92', autoJoin: true });
  await new Promise(resolve => setImmediate(resolve));
  const status = find(expired.document.body, node => typeof node.textContent === 'string' &&
    node.textContent.includes('房间已过期'));
  const join = find(expired.document.body, node => node.textContent === '输入房间码加入');
  assert.ok(status && join);
  assert.equal(join.disabled, false, 'After failed auto-join manual retry is possible');
  await join.onclick();
  assert.deepEqual(expired.calls.join, ['AB7K92', 'AB7K92']);
  console.log('QR invitation passed: private local QR, safe URL, one-scan auto-join and manual retry.');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
