/* Run: node tests/neon-survivor-teammates.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const css = fs.readFileSync(root + 'css/game.css', 'utf8');
const core = fs.readFileSync(root + 'js/core.js', 'utf8');
assert.match(html, /network\/teammates\.js/);
assert.ok(html.indexOf('network/teammates.js') < html.indexOf('network/coop.js'));
assert.match(css, /\.neon-teammate-indicator/);
assert.match(css, /\.neon-color-swatch/);
assert.match(core, /ctx\.strokeStyle = localProfile\.color/);

const store = new Map();
const elements = [];
class Element {
  constructor(tag) {
    this.tag = tag; this.children = []; this.isConnected = false;
    this.style = { setProperty(key, value) { this[key] = value; } };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this[name] = value; }
  querySelector(selector) {
    return this.children.find(node => node.className === selector.slice(1)) || null;
  }
}
const document = {
  body: new Element('body'),
  getElementById(id) {
    if (id === 'hud') return { style: { display: 'none' }, getBoundingClientRect: () => ({ bottom: 95 }) };
    return elements.find(el => el.id === id) || null;
  },
  createElement(tag) {
    const el = new Element(tag);
    elements.push(el);
    return el;
  }
};
const originalAppendChild = document.body.appendChild.bind(document.body);
document.body.appendChild = child => {
  child.isConnected = true;
  return originalAppendChild(child);
};
const settings = new Map([['playerName', '银河领航员'], ['shipColor', 'mint']]);
const window = { NeonGameSettings: { get(key) { return settings.get(key); } } };
const sandbox = { window, document, console, navigator: { getGamepads: () => [] },
  performance: { now: () => 1000 } };
vm.createContext(sandbox);
for (const file of ['teammates', 'coop']) {
  vm.runInContext(fs.readFileSync(root + 'js/network/' + file + '.js', 'utf8'), sandbox);
}
const team = window.NeonLanTeammates;
assert.equal(team.ownProfile('host').color, '#68ffd2');
assert.equal(team.ownProfile('guest').color, '#68ffd2');
settings.set('shipColor', 'auto');
assert.equal(team.ownProfile('host').color, '#00f3ff');
assert.equal(team.ownProfile('guest').color, '#ffbb55');
assert.equal(team.normalizeProfile({ name: '<script>Boss</script>', color: 'violet' }, 'guest').name,
  'Boss');
assert.equal(team.normalizeProfile({ name: 'X', color: 'javascript:red' }, 'guest').color,
  '#ffbb55');

const portrait = { width: 390, height: 844, hudBottom: 116 };
const landscape = { width: 844, height: 390, hudBottom: 60 };
const center = { x: 0, y: 0 };
assert.equal(team.markerPosition(portrait, center, { x: 25, y: 50 }, 1), null);
const right = team.markerPosition(portrait, center, { x: 1100, y: 0 }, 1);
assert.ok(right.x <= 390 - 55 && right.x >= 55);
assert.ok(Math.abs(right.y - 422) < 1);
assert.equal(right.angle, 0);
const upward = team.markerPosition(portrait, center, { x: 0, y: -500 }, 1.5);
assert.ok(upward.y >= 132, 'Marker should remain below the portrait HUD');
assert.equal(upward.angle, -90);
const diagonal = team.markerPosition(landscape, center, { x: -500, y: 600 }, 0.7);
assert.ok(diagonal.x >= 55);
assert.ok(diagonal.y <= 390 - Math.min(390 * .28, 76));
assert.equal(team.markerPosition(landscape, center, { x: 100, y: 0 }, 0.7), null);
// Local camera zoom makes near objects leave/enter the visible area.
assert.equal(team.markerPosition(portrait, center, { x: 145, y: 0 }, 0.65), null);
assert.ok(team.markerPosition(portrait, center, { x: 145, y: 0 }, 1.5));

const game = { width: 390, height: 844, cameraZoom: 1, camera: center };
const self = { x: 0, y: 0 };
const teammate = { x: 900, y: 0 };
team.update(game, center, teammate, self, { name: '远处舰友', color: '#b18aff' }, true);
const bubble = document.getElementById('neon-teammate-indicator');
assert.ok(bubble && bubble.hidden === false);
assert.match(bubble.querySelector('.teammate-label').textContent, /远处舰友 · 距离900/);
assert.equal(bubble.style['--teammate-color'], '#b18aff');
assert.equal(bubble.querySelector('.teammate-arrow').style.transform, 'rotate(0deg)');
team.update(game, center, { x: 30, y: 20 }, self, {}, true);
assert.equal(bubble.hidden, true, 'Bubble disappears as soon as teammate enters the view');
team.update(game, center, teammate, self, {}, false);
assert.equal(bubble.hidden, true);

const sent = [];
const connection = { role: 'guest', connected: true, send(message) { sent.push(message); return true; } };
const guest = new window.NeonLanCoop.Coop({ player: { x: 0, y: 0 } }, connection);
assert.equal(guest.sendLocalProfile(), true);
assert.deepEqual(JSON.parse(JSON.stringify(sent[0])), {
  type: 'profile', name: '银河领航员', color: 'auto'
});
const hostGame = {
  state: 'playing', endlessMode: false, survivalTime: 12, kills: 3,
  player: { x: 0, y: 0, hp: 100, maxHp: 100, aimAngle: 0, level: 2 },
  enemies: [], bullets: [], enemyBullets: [], gems: []
};
const host = new window.NeonLanCoop.Coop(hostGame, { role: 'host', connected: true });
host.onMessage({ type: 'profile', name: '小猫战机', color: 'pink' });
host.startHost();
assert.equal(host.ally.profile.name, '小猫战机');
assert.equal(host.ally.profile.color, '#ff77b7');
const frame = window.NeonLanCoop.snapshot(hostGame, host.ally, 1);
assert.equal(frame.host.name, '银河领航员');
assert.equal(frame.host.color, '#00f3ff');
assert.equal(frame.guest.name, '小猫战机');
assert.equal(frame.guest.color, '#ff77b7');
host.onMessage({ type: 'profile', name: '<broken>舰友', color: 'invalid' });
assert.equal(host.ally.profile.name, '舰友');
assert.equal(host.ally.profile.color, '#ffbb55');
console.log('Neon Survivor teammates passed: saved identities, palette sanitizing, off-screen pointers and authoritative profile snapshots.');
