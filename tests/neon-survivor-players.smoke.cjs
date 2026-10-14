/* Run: node tests/neon-survivor-players.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.indexOf('js/players.js') > 0);
assert.ok(html.indexOf('js/players.js') < html.indexOf('js/network/coop.js'));
assert.ok(html.indexOf('js/players.js') < html.indexOf(neonCore.coreScriptPaths()[0]));

const sandbox = { window: {}, console, performance: { now: () => 1000 },
  document: { body: { classList: { remove() {} } }, getElementById: () => null },
  setTimeout, clearTimeout, setInterval, clearInterval };
vm.createContext(sandbox);
for (const file of ['players', 'network/coop'])
  vm.runInContext(fs.readFileSync(root + 'js/' + file + '.js', 'utf8'), sandbox);
const { PlayerRegistry, MAX_PLAYERS, validId } = sandbox.window.NeonPlayers;
assert.equal(MAX_PLAYERS, 4);
assert.equal(validId('guest-3'), true);
assert.equal(validId('__proto__'), false);
assert.equal(validId(''), false);
assert.equal(validId('guest<script>'), false);

const registry = new PlayerRegistry();
const host = { x: 10, y: 25, hp: 100, maxHp: 100, level: 1 };
assert.equal(registry.register('host', host), host);
assert.equal(registry.get('host'), host, 'Registration must keep the original combat object');
assert.throws(() => registry.register('host', {}), /already registered/);
assert.throws(() => registry.register('guest<script>', {}), /Invalid player ID/);
registry.register('guest', { x: 30, hp: 80 });
registry.register('guest-2', { x: 50, hp: 90 });
registry.register('guest-3', { x: 70, hp: 55, shipId: 'astra' });
assert.equal(registry.size, 4);
assert.throws(() => registry.register('guest-4', {}), /full/);
const projection = registry.project();
assert.equal(projection.length, 4);
assert.equal(projection[0].shipId, 'riftblade');
assert.equal(projection[3].shipId, 'astra');
assert.equal(Object.isFrozen(projection[0]), true);
assert.equal(Object.isFrozen(projection), true);
assert.equal('weapons' in projection[0], false);
assert.equal(registry.remove('guest-2'), true);
assert.equal(registry.get('guest-2'), null);
assert.equal(registry.size, 3);
assert.throws(() => registry.replace('guest-2', {}), /Unknown player/);
const newHost = { hp: 42 };
registry.replace('host', newHost);
assert.equal(registry.get('host'), newHost);
assert.equal(registry.size, 3);

// The legacy LAN co-op adapter now registers and deregisters the exact ally
// object. Existing game.player and coop.ally remain canonical references.
const game = { player: host, players: new PlayerRegistry(), state: 'playing',
  modalLevelup: { classList: { remove() {} } },
  lanRTC: null, showStartMenu() {} };
game.players.register('host', host);
const rtc = { role: 'host', connected: true };
const coop = new sandbox.window.NeonLanCoop.Coop(game, rtc);
coop.startHost();
assert.equal(game.players.get('guest'), coop.ally);
assert.equal(game.players.get('host'), game.player);
assert.equal(game.players.size, 2);
const oldAlly = coop.ally;
coop.startHost();
assert.notEqual(oldAlly, coop.ally);
assert.equal(game.players.get('guest'), coop.ally, 'Restart replaces only guest state');
assert.equal(game.players.size, 2);
coop.stop();
assert.equal(game.players.get('guest'), null);
assert.equal(game.players.get('host'), host);
assert.equal(game.players.size, 1);
console.log('Player registry passed: four IDs, caps, identity, snapshots and co-op lifecycle.');
