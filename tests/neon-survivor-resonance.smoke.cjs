/* Run: node tests/neon-survivor-resonance.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
assert.match(html, /network\/resonance\.js/);
assert.ok(html.indexOf('network/resonance.js') < html.indexOf('network/coop.js'));
const sandbox = {
  window: { addEventListener() {} }, console,
  navigator: { getGamepads: () => [] },
  document: { getElementById() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => 0 }, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(sandbox);
neonCore.runScripts(sandbox, ['network/schema','network/resonance', 'network/coop']);
const { link, update, recordDash } = sandbox.window.NeonLanResonance;
const { Coop } = sandbox.window.NeonLanCoop;
const host = { x: 0, y: 0, hp: 70, maxHp: 100, dmgMultiplier: 1 };
const ally = { x: 400, y: 0, hp: 50, maxHp: 100 };
assert.equal(link(host, ally).damageBonus, 0);
ally.x = 340;
assert.equal(link(host, ally).damageBonus, 0.05);
ally.x = 181;
assert.equal(link(host, ally).damageBonus, 0.05);
ally.x = 180;
assert.equal(link(host, ally).damageBonus, 0.08);
ally.hp = 0;
assert.equal(link(host, ally).active, false, 'Downed teammate grants no link bonus');
ally.hp = 50;

const enemies = [
  { x: 100, y: 0, hp: 1000, dead: false },
  { x: 800, y: 0, hp: 1000, dead: false }
];
let calls = [];
const game = {
  survivalTime: 10, state: 'playing', player: host, enemies,
  shockwaves: [], texts: [],
  dealDamage(enemy, amount, source) {
    enemy.hp -= amount;
    calls.push({ source, amount });
  }
};
const state = { link: null, pulseCooldown: 0, lastDash: {} };
update(game, ally, state, 1);
assert.equal(host.hp, 70, 'Passive regeneration is replaced by class contributions');
assert.equal(ally.hp, 50);
assert.equal(state.link.tier, 2);
assert.equal(recordDash(game, ally, state, 'host', 10), false);
assert.equal(recordDash(game, ally, state, 'guest', 10.4), true);
assert.equal(calls.length, 1);
assert.equal(calls[0].source, 'lan-resonance');
assert.equal(enemies[1].hp, 1000, 'Only in-range enemies take pulse damage');
assert.equal(state.pulseCooldown, 8);
recordDash(game, ally, state, 'host', 10.45);
assert.equal(recordDash(game, ally, state, 'guest', 10.5), false);
assert.equal(calls.length, 1, 'Pulse cannot repeat while on cooldown');
update(game, ally, state, 8);
assert.equal(state.pulseCooldown, 0);
assert.equal(recordDash(game, ally, state, 'host', 18), false);
assert.equal(recordDash(game, ally, state, 'guest', 18.4), true);
assert.equal(calls.length, 2);
ally.x = 600;
const hp = host.hp;
update(game, ally, state, 1);
assert.equal(host.hp, hp, 'No regeneration when outside the link');
assert.equal(state.link.tier, 0);

// Host damage gets the link bonus exactly once. Guest damage is pre-buffed
// by the host-owned helper and excluded from another host-side multiplication.
const proto = vm.runInContext('NeonSurvivorGame.prototype', sandbox);
const combat = Object.create(proto);
combat.player = { ...host, level: 1, critRate: 0, critDmg: 1.5 };
combat.texts = []; combat.particles = [];
combat.totalDamageDealt = 0; combat.endlessMode = false;
combat.lanCoop = { ally, getLinkBonus: () => 0.08 };
combat.getLevelDmgMult = () => 1;
combat.onEnemyKilled = () => {};
const target1 = { x: 0, y: 0, hp: 1000, color: '#fff' };
combat.dealDamage(target1, 100, 'laser');
assert.equal(target1.hp, 892);
const target2 = { x: 0, y: 0, hp: 1000, color: '#fff' };
combat.dealDamage(target2, 100, 'lan-ally');
assert.equal(target2.hp, 892, 'Guest source receives one, not zero or two, class bonuses');
const target3 = { x: 0, y: 0, hp: 1000, color: '#fff' };
combat.dealDamage(target3, 100, 'lan-resonance');
assert.equal(target3.hp, 900);

const snapshots = [];
const connection = { role: 'host', connected: true, send: x => snapshots.push(x) };
const game2 = {
  state: 'playing', player: { x: 0, y: 0, hp: 100, maxHp: 100, level: 1, dmgMultiplier: 1 },
  survivalTime: 0, kills: 0, enemies: [], enemyBullets: [], bullets: [], gems: [],
  shockwaves: [], texts: [], particles: [],
  dealDamage() {}
};
const coop = new Coop(game2, connection);
coop.startHost();
coop.ally.x = 100;
coop.updateHost(0.12);
assert.equal(snapshots[0].resonance.tier, 2);
assert.ok(Math.abs(snapshots[0].resonance.damageBonus - 0.08) < .001,
  'A short threat smoothing tick should not change the base bonus materially');
console.log('Neon Survivor resonance passed: class-based proximity bonuses, joint dash cooldown and host-authoritative damage.');
