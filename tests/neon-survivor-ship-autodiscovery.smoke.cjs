/* Run: node tests/neon-survivor-ship-autodiscovery.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

async function main() {
  const root = 'public/Game/neon-survivor/';
  const html = fs.readFileSync(root + 'index.html', 'utf8');
  assert.ok(html.includes('js/ships.generated.js'));
  assert.ok(html.indexOf('js/ships.js') < html.indexOf('js/ships.generated.js'));
  assert.ok(html.indexOf('js/ships.generated.js') < html.indexOf('js/core.js'));
  assert.ok(html.includes('id="neon-ship-selector"'));
  const { buildShipBundle } = await import(pathToFileURL(path.resolve('tools/neon-survivor/generate-ships.mjs')).href);
  const rootFiles = path.resolve(root + 'js');
  const expected = await buildShipBundle(path.join(rootFiles, 'ships'), rootFiles);
  assert.equal(fs.readFileSync(root + 'js/ships.generated.js', 'utf8'), expected,
    'Committed generated bundle must match detected ship folders');

  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'neon-ship-'));
  try {
    for (const id of ['comet', 'nova_x']) {
      const dir = path.join(temp, id);
      await fsp.mkdir(dir);
      const ship = `{(() => {})}\nwindow.NeonShips.register({id:'${id}', name:'${id}', playable:true, rendererId:'${id}', warpTreeId:'assault', startingWeapon:'blaster', activeSkillIds:[], baseStats:{hp:100,speed:240,regen:.8,dashCharges:3}});`;
      // Plain classic JS files and deterministic order: ship → renderer → abilities → upgrades.
      await fsp.writeFile(path.join(dir, 'ship.js'), ship.replace('{(() => {})}', ''));
      await fsp.writeFile(path.join(dir, 'renderer.js'), `window.NeonShips.registerRenderer('${id}', (ctx)=>ctx.beginPath());`);
      await fsp.writeFile(path.join(dir, 'abilities.js'), `window.NeonShips.registerAbilities('${id}', {onTick(p){p.shipTicks=(p.shipTicks||0)+1;}});`);
      await fsp.writeFile(path.join(dir, 'upgrades.js'), `window.NeonShips.registerUpgradeCatalog('${id}', [{id:'${id}_boost', type:'passive', rarity:'rare', name:'Boost', maxLvl:3}]);`);
      await fsp.writeFile(path.join(dir, 'effects.js'), `window.NeonShips.registerEffects('${id}', {pilot(ctx,p){ctx.pilotSeen=p.shipId;},network(ctx,p){ctx.remoteSeen=p.shipId;}});`);
      await fsp.writeFile(path.join(dir, 'network.js'), `window.NeonShips.registerNetworkProjection('${id}', p=>({shipState:{fuel:Math.max(0,Math.min(100,p.fuel||0))}}));`);
      await fsp.writeFile(path.join(dir, 'README.md'), 'Ship notes');
      await fsp.mkdir(path.join(dir, 'assets'));
    }
    const bundle = await buildShipBundle(temp, temp);
    assert.ok(bundle.indexOf('comet/ship.js') < bundle.indexOf('comet/renderer.js'));
    assert.ok(bundle.indexOf('comet/renderer.js') < bundle.indexOf('comet/abilities.js'));
    const makeElement = tag => ({
      tag, children: [], style: {}, attributes: {},
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...children) { this.children = children; },
      setAttribute(name, value) { this.attributes[name] = value; }
    });
    const uiRoot = makeElement('div');
    const sandbox = {window:{},console,document:{
      getElementById: id => id === 'neon-ship-selector' ? uiRoot : null,
      createElement:makeElement
    }};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(root + 'js/ships.js', 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(root + 'js/ships.generated.js', 'utf8'), sandbox);
    vm.runInContext(bundle, sandbox);
    vm.runInContext(fs.readFileSync(root + 'js/ship-selection.js', 'utf8'), sandbox);
    const ships = sandbox.window.NeonShips;
    assert.equal(ships.get('comet').playable, true);
    assert.equal(ships.get('nova_x').playable, true);
    assert.equal(ships.get('astra').playable, true);
    assert.equal(ships.get('phantom').playable, true);
    assert.equal(ships.upgradeCatalogFor({shipId:'nova_x'})[0].id,'nova_x_boost');
    const extra=ships.projectForNetwork({shipId:'comet',fuel:17});
    assert.equal(extra.shipState.fuel,17);
    const effectCtx={};
    assert.equal(ships.drawPilotEffects(effectCtx,{shipId:'nova_x'},{}),true);
    assert.equal(effectCtx.pilotSeen,'nova_x');
    assert.equal(ships.drawNetworkEffects(effectCtx,{shipId:'comet'},{}),true);
    assert.equal(effectCtx.remoteSeen,'comet');
    const p = {shipId:'comet'};
    ships.runAbility(p, 'onTick');
    assert.equal(p.shipTicks, 1);
    const game = {selectedShipId:'riftblade'};
    sandbox.window.NeonShipSelection.render(game);
    const buttons = uiRoot.children[1].children;
    assert.equal(buttons.length,5,'All three built-in and two auto-discovered playable ships appear');
    const cometButton = buttons.find(button => button.textContent === 'comet');
    assert.ok(cometButton);
    cometButton.onclick();
    assert.equal(game.selectedShipId,'comet','New ship can be selected without editing main game');
    assert.ok(buttons.some(button=>button.textContent==='星织·织界术师'));
    assert.ok(buttons.some(button=>button.textContent==='幽灵·共生拟态'));

    await fsp.rm(path.join(temp,'comet','renderer.js'));
    await assert.rejects(buildShipBundle(temp,temp),/Missing ships\/comet\/renderer.js/);
    await fsp.writeFile(path.join(temp,'comet','renderer.js'),'export default {}');
    await assert.rejects(buildShipBundle(temp,temp),/Unexpected token|Unexpected/);
  } finally {
    await fsp.rm(temp, {recursive:true,force:true});
  }
  console.log('Auto-discovery passed: drop in two new ships, generated registrations, per-ship abilities/upgrades, automatic selection and invalid-plugin failure.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
