/* Run: node tests/neon-survivor-ship-effects.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const base = 'public/Game/neon-survivor/js/';
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const name of ['ships.js', 'ships.generated.js']) {
  vm.runInContext(fs.readFileSync(base + name, 'utf8'), ctx);
}
const ships = ctx.window.NeonShips;
const events = [];
ships.register({ id: 'comet', name: 'Comet', playable: true,
  rendererId: 'comet', warpTreeId: 'assault', startingWeapon: 'blaster',
  activeSkillIds: [], baseStats: { hp: 100, speed: 250, regen: .8, dashCharges: 3 } });
ships.registerEffects('comet', {
  pilot(_context, pilot) { events.push('pilot:' + pilot.id); },
  world(_context, game) { events.push('world:' + game.state); }
});
const game = { state: 'playing', player: { id: 'host', shipId: 'comet' },
  players: { list() { return [
    { id: 'host', state: game.player },
    { id: 'guest', state: { id: 'guest', shipId: 'comet' } },
    { id: 'guest-2', state: { id: 'guest-2', shipId: 'riftblade' } }
  ]; } } };
assert.equal(ships.drawPilotEffects({}, game.player, game), true);
assert.equal(ships.drawPilotEffects({}, { id: 'guest', shipId: 'comet' }, game), true);
assert.equal(ships.drawWorldEffects({}, game), 1);
assert.equal(ships.drawPilotEffects({}, { shipId: 'riftblade' }, game), false);
assert.equal(ships.drawWorldEffects({}, game), 1, 'World effects run only once per ship type');
assert.equal(events.join(','), 'pilot:host,pilot:guest,world:playing,world:playing');
assert.throws(() => ships.registerEffects('comet', {}), /already registered/);
assert.throws(() => ships.registerEffects('nonexistent', {}), /Unknown ship/);
assert.throws(() => ships.registerEffects('riftblade', { draw: ()=>{} }), /Invalid ship effects/);
// Built-in class-specific renders are registered by the discovered files.
const astra = { id:'astra', shipId:'astra', hp:95, x:0, y:0 };
const phantom = { id:'phantom', shipId:'phantom', hp:85, x:0, y:0 };
const canvas = new Proxy({}, { get(_obj, key) { return () => {}; } });
assert.equal(ships.drawPilotEffects(canvas, astra, game), true);
assert.equal(ships.drawPilotEffects(canvas, phantom, game), true);
const core = neonCore.coreSource();
assert.ok(core.includes('NeonShips?.drawPilotEffects'));
assert.ok(core.includes('NeonShips?.drawWorldEffects'));
console.log('Ship effects passed: auto-loaded per-ship visuals, one world render per type and no core-specific visual registry.');
