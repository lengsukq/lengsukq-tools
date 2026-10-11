/* Run: node tests/neon-survivor-guest-upgrade.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const sandbox = {
  window: { addEventListener() {} }, console,
  document: { getElementById: () => null },
  navigator: { getGamepads: () => [] },
  localStorage: { getItem: () => null, setItem() {} },
  performance: { now: () => 1000 }, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
for (const file of ['network/experience', 'network/coop', 'core'])
  vm.runInContext(fs.readFileSync(root + file + '.js','utf8'), sandbox);
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const { Coop } = sandbox.window.NeonLanCoop;
const effects = [];
const game = Object.assign(Object.create(proto), {
  state: 'playing', difficulty: 0,
  survivalTime: 80, kills: 3,
  width: 600, height: 700,
  enemies: [{ x: 100, y: 0, hp: 2000, maxHp: 2000, radius: 16, dead: false }],
  bullets: [], enemyBullets: [], particles: [], gems: [], shockwaves: [], texts: [],
  laserBeams: [], blackHoles: [], mines: [],
  player: { x: 0, y: 0, hp: 100, maxHp: 100, level: 2, xp: 0, xpNeeded: 90,
    aimAngle: 0, critRate: 0, critDmg: 1.5, weapons: { blaster: 1 }, passives: {} },
  sound: { playLaser() {}, playZap() {}, playExplosion() {}, playBeam() {} },
  dealDamage(enemy, damage, source, forceCrit, attacker) {
    effects.push({ damage, source, attacker });
    enemy.hp -= damage;
  },
  getDifficultyRules() { return { enemyDamage: 1, normalDrops: 1 }; }
});
const sent = [];
const rtc = { connected: true, role: 'host', send(data) { sent.push(data); return true; } };
const host = new Coop(game, rtc);
game.lanCoop = host;
host.startHost();
const ally = host.ally;
assert.equal(ally.level, 1);
sandbox.window.NeonLanExperience.synchronizeLevel(game);
assert.equal(ally.pendingUpgrades, 1, 'Both pilots earn one card at the shared level up');
host.updateHost(.08);
assert.equal(game.state, 'coop-guest-upgrade');
assert.ok(ally.choices.length > 0 && ally.choices.length <= 3);
const invalid = { type: 'upgrade_pick', id: '__inject', seq: 10 };
host.onMessage(invalid);
assert.equal(ally.pendingUpgrades, 1, 'Invalid upgrade cannot be injected');
const selection = ally.choices[0];
const expected = game.getCoopUpgradeDefinition(selection);
assert.ok(expected);
host.onMessage({ type: 'upgrade_pick', id: selection, seq: 11 });
assert.equal(ally.pendingUpgrades, 0);
assert.equal(game.state, 'playing', 'Gameplay resumes after guest finishes picking');
const collection = expected.type === 'weapon' ? ally.weapons :
  expected.type === 'passive' ? ally.passives : ally.dashUpgrades;
assert.ok(collection[selection] > 0);
host.onMessage({ type: 'upgrade_pick', id: selection, seq: 11 });
assert.equal(ally.upgradeRound, 1, 'Repeated pick cannot stack cards');

// Both pilots use original solo weapon functions, never a simplified fixed
// 22-damage guest-only implementation.
ally.weapons = { blaster: 2, tesla: 1, missiles: 1, laser: 1 };
ally.dmgMultiplier = 1.25;
ally.timers = { blaster: .5, tesla: 2.5, missiles: 2.5, laser: 2.5 };
host.updateGuestWeapons(.1);
assert.ok(game.bullets.length >= 2, 'Solo blaster/missiles emit real projectiles for guest');
assert.ok(game.bullets.every(b => b.owner === 'guest'));
assert.ok(game.laserBeams.length > 0, 'Solo laser beam renderer is shared');
assert.ok(effects.some(effect => effect.attacker === ally),
  'Instant hit weapons must apply guest-specific combat stats');
const bulletCount = game.bullets.length;
game.state = 'paused';
host.updateHost(.5);
assert.equal(game.bullets.length, bulletCount, 'Host pause freezes guest weapons');

// Guest card presentation delegates to the actual game upgrade catalog,
// and sends only a validated ID (not a client-authored damage value).
const pickRequests = [];
const clientRTC = { connected: true, role: 'guest',
  send(data) { pickRequests.push(data); return true; } };
const clientGame = {
  modalLevelup: { classList: { add() {}, remove() {} } },
  getCoopUpgradeDefinition: id => game.getCoopUpgradeDefinition(id),
  renderUpgradeChoices(choices) { this.presented = choices; }
};
const client = new Coop(clientGame, clientRTC);
client.guestMode = true;
const guestFrame = { phase: 'coop-guest-upgrade', teamXP: { level: 2 },
  guest: { choices: ['tesla','missiles','laser'], upgradeRound: 1 } };
const view = Object.create(clientGame);
view.player = { weapons: { blaster: 1 }, passives: {}, dashUpgrades: {} };
client.latest = guestFrame;
client.syncGuestUpgrade(guestFrame, view);
assert.equal(view.presented.length, 3, 'Guest receives the same catalog-backed upgrade cards');
assert.equal(client.pickGuestUpgrade('__inject'), false);
assert.equal(client.pickGuestUpgrade('tesla'), true);
assert.equal(pickRequests[0].id, 'tesla');
assert.equal(client.pickGuestUpgrade('missiles'), false, 'Cannot spend one card twice');
console.log('Independent guest upgrades passed: shared XP, authoritative card validation, real weapon firing, paused world and same UI.');
