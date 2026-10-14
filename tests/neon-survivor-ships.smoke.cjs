/* Run: node tests/neon-survivor-ships.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.ok(html.indexOf('js/ships.js') > 0);
assert.ok(html.indexOf('js/ships.js') < html.indexOf('js/ships.generated.js'));
assert.ok(html.indexOf('js/ships.generated.js') < html.indexOf('js/players.js'));
assert.ok(html.indexOf('js/ships.js') < html.indexOf('js/players.js'));
assert.ok(html.indexOf('js/ships.js') < html.indexOf(neonCore.coreScriptPaths()[0]));
const sandbox = { window: {}, console, performance: { now: () => 1000 } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + 'js/ships.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(root + 'js/ships.generated.js', 'utf8'), sandbox);
const ships = sandbox.window.NeonShips;
assert.equal('MAX_SHIPS' in ships, false, 'Adding ship #5 must not require changing the engine');
assert.equal(ships.DEFAULT_SHIP_ID, 'riftblade');
assert.equal(ships.list().length, 3, 'All three playable ships are offered');
assert.equal(ships.list(false).length, 3, 'Exactly three built-in ships are registered');
assert.equal(ships.get('astra').playable, true);
assert.equal(ships.get('astra').baseStats.hp, 95);
assert.equal(ships.get('astra').baseStats.speed, 235);
assert.equal(ships.get('astra').warpTreeId, 'phase');
assert.equal(ships.get('astra').activeSkillIds.length, 2);
assert.equal(ships.get('phantom').playable, true);
assert.equal(ships.get('phantom').baseStats.hp, 92);
assert.equal(ships.get('phantom').baseStats.speed, 265);
assert.equal(ships.get('phantom').warpTreeId, 'spectral');
assert.equal(ships.get('phantom').activeSkillIds.length, 2);
const original = ships.get('riftblade');
assert.equal(original.name, '裂锋·虚空突击者');
assert.equal(original.code, 'RIFTBLADE');
assert.equal(original.warpTreeId, 'assault');
assert.equal(original.startingWeapon, 'blaster');
assert.equal(original.baseStats.hp, 100);
assert.equal(original.baseStats.speed, 240);
assert.equal(original.baseStats.regen, 0.8);
assert.equal(original.baseStats.dashCharges, 3);
assert.equal(original.passiveId, null);
assert.equal(original.activeSkillIds.length, 0);
const start = ships.startingState('riftblade');
assert.equal(start.maxHp, 100);
assert.equal(start.hp, 100);
assert.equal(start.baseSpeed, 240);
assert.equal(start.regen, .8);
assert.equal(start.dashCharges, 3);
assert.equal(start.weapons.blaster, 1);
assert.equal(Object.keys(start.passives).length, 0);
start.weapons.blaster = 5;
assert.equal(ships.startingState('riftblade').weapons.blaster, 1,
  'Starting loadout is copied per pilot; no shared mutable upgrade objects');
assert.equal(Object.isFrozen(original), true);
assert.equal(Object.isFrozen(original.baseStats), true);

// The existing Riftblade renderer is reusable by any game.player or coop.ally.
const operations = [];
const canvas = new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return (...args) => operations.push([prop, ...args]);
  },
  set(target, prop, value) { target[prop] = value; return true; }
});
assert.equal(ships.drawHull(canvas, { shipId: 'riftblade' }, { color: '#ffbb55' }), true);
assert.ok(operations.some(([name]) => name === 'moveTo'));
assert.ok(operations.some(([name]) => name === 'stroke'));
const candidate = {
  id: 'sentinel', code: 'SENTINEL', name: '预留战舰A',
  description: '法术与空间折跃', playable: false,
  baseStats: { hp: 95, speed: 235, regen: 0.8, dashCharges: 2 },
  startingWeapon: 'star_weave', passiveId: 'mana_return',
  activeSkillIds: ['meteor', 'ward'], warpTreeId: 'phase', rendererId: 'astra'
};
const as = ships.register(candidate);
assert.equal(as.activeSkillIds.length, 2);
assert.equal(ships.list().length, 3, 'Unimplemented fourth ship stays locked');
assert.equal(ships.list(false).length, 4);
assert.equal(ships.resolve('astra').id, 'astra');
assert.equal(ships.resolve('phantom').id, 'phantom');
assert.equal(ships.startingState('astra').weapons.star_weave, 1);
assert.equal(ships.startingState('phantom').weapons.phantom_scythe, 1);
assert.equal(ships.startingState('astra').dashCharges, 2);
assert.equal(ships.startingState('phantom').dashCharges, 2);
assert.throws(() => ships.register(candidate), /already registered/);
assert.throws(() => ships.register({ ...candidate, id: '../escape' }), /Invalid ship definition/);
ships.register({ ...candidate, id: 'specter', rendererId: 'phantom' });
assert.equal(ships.list(false).length, 5);
ships.register({ ...candidate, id: 'fifth_ship', rendererId: 'fifth_ship' });
assert.equal(ships.list(false).length, 6);
const callbacks = [];
ships.registerAbilities('riftblade', { onStart(player, game) { callbacks.push([player.id, game.phase]); } });
assert.throws(() => ships.registerAbilities('riftblade', {}), /already registered/);
assert.throws(() => ships.registerAbilities('unknown', {}), /Unknown ship/);
assert.throws(() => ships.registerAbilities('sentinel', { damage: 999 }), /Invalid ship abilities/);
ships.runAbility({ shipId: 'riftblade', id: 'host' }, 'onStart', { phase: 'ready' });
assert.equal(callbacks.length, 1);
assert.equal(callbacks[0][0], 'host');
assert.equal(ships.runAbility({ shipId: 'sentinel' }, 'onStart', {}), undefined,
  'Non-playable test ships never execute ability hooks');
assert.throws(() => ships.registerRenderer('riftblade', () => {}), /already registered/);
console.log('Ship registry passed: default Riftblade parity, unlimited ship definitions, lifecycle plugins and safe locked previews.');
