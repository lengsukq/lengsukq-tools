/* Run: node tests/neon-survivor-resonance-bonus.smoke.cjs
 *
 * The proximity link promises three class contributions: a Riftblade's damage,
 * an Astra's periodic shield, a Phantom's crit. Two of them worked. The third
 * did not exist at all -- `link()` computed `critBonus`, and NOTHING read it, so
 * the one pairing that depends on it received nothing:
 *
 *   two Phantoms  -> damageBonus 0 (needs a Riftblade)
 *                    shieldSource false (needs an Astra)
 *                    critBonus 0.12, thrown away
 *
 * and the only feedback was a dashed line plus a canvas label that rendered as
 * an EMPTY string for that pairing. These assertions are the guarantee that every
 * pairing gets something, that the number shown is the number applied, and that
 * the presentation is one shared painter rather than two hand-written blocks.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');

const ROOT = neonCore.ROOT;
const read = part => fs.readFileSync(ROOT + '/' + part, 'utf8');

/** A fresh sandbox: the tests below stub Math.random, which must not leak. */
function sandbox() {
  const node = {
    id: '', className: '', dataset: {}, hidden: true, textContent: '',
    setAttribute() {}, isConnected: true
  };
  const box = {
    window: { addEventListener() {} },
    document: {
      getElementById: () => node, addEventListener() {},
      body: { appendChild() {} }, createElement: () => node
    },
    navigator: { getGamepads: () => [] },
    localStorage: { getItem: () => null, setItem() {} },
    console, performance: { now: () => 1000 },
    setTimeout, clearTimeout, setInterval, clearInterval
  };
  vm.createContext(box);
  neonCore.runScripts(box, ['ships', 'ships.generated', 'players', 'network/schema',
    'network/snapshots', 'network/resonance', 'network/resonance-hud', 'network/coop']);
  box.__node = node;
  return box;
}

const proto = box => vm.runInContext('NeonSurvivorGame.prototype', box);

/** A host world with one guest, both at tier 2 (100 units apart). */
function world(box, hostShip, allyShip, gap = 100) {
  const { PlayerRegistry, createRemotePilot } = box.window.NeonPlayers;
  const game = Object.assign(Object.create(proto(box)), {
    state: 'playing', survivalTime: 100, width: 800, height: 600, ctx: {},
    bullets: [], enemies: [], enemyBullets: [], gems: [], particles: [], texts: [],
    shockwaves: [], laserBeams: [], blackHoles: [], mines: [], lightningTethers: [],
    dashTrails: [], orbiters: [], companionDrones: [], weaponTimers: {},
    difficulty: 3, endlessMode: false, totalDamageDealt: 0,
    player: {
      x: 0, y: 0, hp: 100, maxHp: 100, level: 1, radius: 16, shipId: hostShip,
      weapons: {}, passives: {}, dashUpgrades: {}, limitBreaks: {}, dmgMultiplier: 1,
      areaMultiplier: 1, extraProjectiles: 0, downed: false, critRate: 0, critDmg: 2
    }
  });
  game.players = new PlayerRegistry();
  game.players.register('host', game.player);
  const ally = createRemotePilot(game, 'guest', allyShip);
  ally.x = gap; ally.y = 0; ally.level = 1; ally.critRate = 0;
  game.players.register('guest', ally);
  const coop = new box.window.NeonLanCoop.Coop(game,
    { role: 'host', connected: true, capacity: 2, send: () => true });
  coop.allies.set('guest', ally);
  coop.resonances.set('guest', { link: null, pulseCooldown: 0, lastDash: {} });
  coop.ally = ally;
  coop.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
  game.lanCoop = coop;
  return { game, ally, coop };
}

/** Damage 100 at a fixed random draw, and report whether it crit. */
const critWith = (box, game, draw) => {
  vm.runInContext(`Math.random = () => ${draw}`, box);
  const target = { x: 0, y: 0, hp: 1e9, radius: 12, color: '#fff' };
  game.dealDamage(target, 100, 'test', false, game.player);
  const dealt = 1e9 - target.hp;
  // critDmg is 2, so a crit doubles the already link-buffed number.
  return dealt > 100 * (1 + game.lanCoop.getLinkBonus(game.player)) + 0.5;
};

// ---------------------------------------------------------------------------
// 1. Every ship pairing receives something at tier 2. The point of the class
//    aura design is that each class contributes, so no pair may get nothing.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const ships = ['riftblade', 'phantom', 'astra'];
  for (const host of ships) {
    for (const guest of ships) {
      const { game, coop } = world(box, host, guest);
      coop.updateHost(1 / 60);
      const link = coop.resonance.link;
      assert.equal(link.tier, 2, `${host}+${guest} should be linked at 100 units`);
      const total = link.damageBonus + link.critBonus +
        (link.shieldSource ? 1 : 0);
      assert.ok(total > 0, `${host} + ${guest} must not receive an empty link`);
      // And the classes are the reason, not luck.
      assert.equal(link.damageBonus > 0, host === 'riftblade' || guest === 'riftblade',
        `${host}+${guest}: damage comes from a Riftblade`);
      assert.equal(link.critBonus > 0, host === 'phantom' || guest === 'phantom',
        `${host}+${guest}: crit comes from a Phantom`);
      assert.equal(link.shieldSource, host === 'astra' || guest === 'astra',
        `${host}+${guest}: the shield comes from an Astra`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. The crit bonus is APPLIED, not merely computed. Deterministic: the draw is
//    stubbed, so this is exact rather than statistical.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const { game, coop } = world(box, 'phantom', 'phantom');
  coop.updateHost(1 / 60);
  assert.equal(coop.getLinkCrit(game.player), 0.12,
    'two Phantoms contribute the strong crit aura');
  // 0.05 < 0.12 -> crit. Before this fix the roll used critRate alone (0).
  assert.equal(critWith(box, game, 0.05), true,
    'a Phantom pair\'s crit aura must reach the damage roll');
  // 0.15 > 0.12 -> no crit, so the bonus is a chance and not a flat buff.
  assert.equal(critWith(box, game, 0.15), false);
  // A pair with no Phantom has no crit aura at all.
  const other = world(box, 'riftblade', 'astra');
  other.coop.updateHost(1 / 60);
  assert.equal(other.coop.getLinkCrit(other.game.player), 0);
  assert.equal(critWith(box, other.game, 0.05), false,
    'without a Phantom there is no crit to add');
}

// ---------------------------------------------------------------------------
// 3. The damage bonus is applied, and still exactly once.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const { game, coop } = world(box, 'riftblade', 'riftblade');
  coop.updateHost(1 / 60);
  assert.equal(coop.getLinkBonus(game.player), 0.08);
  vm.runInContext('Math.random = () => 0.99', box);   // never crit
  const target = { x: 0, y: 0, hp: 1e9, radius: 12, color: '#fff' };
  game.dealDamage(target, 100, 'test', false, game.player);
  assert.equal(Math.round((1e9 - target.hp) * 100) / 100, 108,
    'the link bonus multiplies the hit exactly once');
  // Out of range: no bonus at all.
  const far = world(box, 'riftblade', 'riftblade', 4000);
  far.coop.updateHost(1 / 60);
  assert.equal(far.coop.getLinkBonus(far.game.player), 0);
}

// ---------------------------------------------------------------------------
// 4. An un-earned shield charge DRAINS while apart. It used to be discarded, so
//    a single frame out of range cost the whole twelve seconds.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const { link, update, remainingShield, SHIELD_INTERVAL, SHIELD_DRAIN_RATE } =
    box.window.NeonLanResonance;
  assert.equal(SHIELD_INTERVAL, 12);
  assert.equal(SHIELD_DRAIN_RATE, 2, 'draining at twice the fill rate is the contract');
  const mk = (ship, x) => ({ shipId: ship, level: 10, x, y: 0, hp: 100, maxHp: 100, downed: false });
  const game = {
    state: 'playing', survivalTime: 0, difficulty: 3, player: mk('astra', 0),
    enemies: [{ damage: 12 }], shockwaves: [], texts: []
  };
  const ally = mk('riftblade', 100);
  const state = { link: null, pulseCooldown: 0, lastDash: {} };
  const step = seconds => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      game.survivalTime += 1 / 60;
      update(game, ally, state, 1 / 60);
    }
  };
  step(11.5);
  assert.ok(state.shieldTimer > 11.4, 'eleven and a half seconds of proximity banks 11.5s');
  ally.x = 4000;
  step(1);
  assert.ok(state.shieldTimer > 9.4 && state.shieldTimer < 9.6,
    `one second apart must cost two seconds of charge, not all of it `
    + `(got ${state.shieldTimer})`);
  assert.equal(link(game.player, ally).active, false, 'and the link itself is still broken');
  ally.x = 100;
  step(4);
  assert.ok(remainingShield(game.player, game.survivalTime) > 0,
    'rejoining must finish the charge instead of restarting it');
}

// ---------------------------------------------------------------------------
// 5. A RISING tier is announced; a steady one is not. Previously nothing marked
//    entering the strong tier at all.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const { update } = box.window.NeonLanResonance;
  const mk = x => ({ shipId: 'riftblade', level: 5, x, y: 0, hp: 100, maxHp: 100, downed: false });
  const game = {
    state: 'playing', survivalTime: 0, difficulty: 3, player: mk(0),
    enemies: [], shockwaves: [], texts: []
  };
  const ally = mk(4000);
  const state = { link: null, pulseCooldown: 0, lastDash: {} };
  const step = seconds => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      game.survivalTime += 1 / 60;
      update(game, ally, state, 1 / 60);
    }
  };
  step(1);
  assert.equal(game.texts.length, 0, 'no announcement while out of range');
  ally.x = 300;                       // tier 1
  step(1);
  assert.equal(game.texts.length, 1, 'entering the link is announced');
  assert.match(game.texts[0].text, /双机联动 Ⅰ/);
  step(2);
  assert.equal(game.texts.length, 1, 'staying in the same tier is not re-announced');
  ally.x = 100;                       // tier 2
  step(1);
  assert.equal(game.texts.length, 2, 'reaching the strong tier is announced again');
  assert.match(game.texts[1].text, /双机联动 Ⅱ/);
  assert.ok(game.shockwaves.length > 0, 'and the strong tier flashes a ring');
}

// ---------------------------------------------------------------------------
// 6. One painter for both screens. The presentation used to be two hand-written
//    draw blocks inside coop.js, which is how they could drift apart.
// ---------------------------------------------------------------------------
{
  const coop = read('js/network/coop.js');
  assert.doesNotMatch(coop, /setLineDash/,
    'the transport must not paint the link itself; call NeonLanResonance.drawLink');
  assert.match(coop, /NeonLanResonance\??\.drawLink\(/,
    'both render paths must go through the shared painter');
  assert.equal((coop.match(/NeonLanResonance\??\.drawLink\(/g) || []).length, 2,
    'the host overlay and the guest renderer both paint it');
  const resonance = read('js/network/resonance.js');
  assert.match(resonance, /function drawLink\(/, 'the painter lives with the rule it draws');
  const html = read('index.html');
  assert.ok(html.indexOf('network/resonance.js') < html.indexOf('network/resonance-hud.js'),
    'the badge module loads after the rule it formats');
  assert.ok(html.indexOf('network/resonance-hud.js') < html.indexOf('network/coop.js'),
    'and before the transport that calls it');
}

// ---------------------------------------------------------------------------
// 7. The badge reports what is actually applied, and is never blank for a
//    linked co-op pair -- two Phantoms used to render an empty label.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const { NeonLanResonanceHud: hud } = box.window;
  for (const [host, guest] of [['phantom', 'phantom'], ['astra', 'astra'],
    ['riftblade', 'riftblade'], ['phantom', 'astra']]) {
    const { game, coop } = world(box, host, guest);
    coop.updateHost(1 / 60);
    const link = coop.resonance.link;
    box.__node.textContent = '';
    hud.update({
      tier: link.tier, damageBonus: link.damageBonus, critBonus: link.critBonus,
      shieldSource: link.shieldSource, shieldNext: 6, shieldHost: 20, shieldGuest: 20
    }, 'host');
    const text = box.__node.textContent;
    assert.ok(text.length > 0, `${host}+${guest} must not render an empty link label`);
    assert.match(text, /联动 Ⅱ/);
    if (link.critBonus > 0) assert.match(text, /暴击/, `${host}+${guest} must show the crit`);
    if (link.damageBonus > 0) assert.match(text, /攻击/);
    if (link.shieldSource) assert.match(text, /护盾/);
  }
  // Out of range tells the player what to do about it, and solo hides entirely.
  hud.update({ tier: 0 }, 'guest');
  assert.match(box.__node.textContent, /靠近队友/);
  hud.update(null, 'solo');
  assert.equal(box.__node.hidden, true, 'a solo run shows no badge at all');
}

// ---------------------------------------------------------------------------
// 8. A guest can only display what it is told, so the crit has to be on the wire.
// ---------------------------------------------------------------------------
{
  const box = sandbox();
  const { game, ally, coop } = world(box, 'phantom', 'phantom');
  coop.updateHost(1 / 60);
  const schema = box.window.NeonLanSchema;
  const wire = box.window.NeonLanCoop.boundedSnapshot(game, ally, 1, coop.resonance, 'guest');
  assert.equal(schema.byteLength(JSON.stringify(wire)) > 0, true);
  assert.equal(wire.resonance.critBonus, 0.12,
    'the guest must be able to show the crit its pilot is receiving');
  assert.equal(wire.resonance.critSource, true);
  assert.equal(wire.resonance.shieldSource, false);
  assert.equal(wire.resonance.damageBonus, 0, 'two Phantoms get no damage bonus');
  // The countdown the badge shows uses the declared interval, not a literal.
  const coopSource = read('js/network/coop.js');
  assert.doesNotMatch(coopSource, /12 - \(resonance\.shieldTimer/,
    'the shield countdown must not restate SHIELD_INTERVAL');
}

console.log('Resonance bonus passed: every ship pairing receives a real bonus, the '
  + 'Phantom crit reaches the damage roll, the shield charge drains instead of '
  + 'resetting, a rising tier is announced, and one shared painter draws the link.');
