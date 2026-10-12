/* Run: node tests/neon-survivor-astra-controls.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='public/Game/neon-survivor/';
const html=fs.readFileSync(root+'index.html','utf8');
for (const id of ['astra-mana-hud','touch-dash-btn','neon-control-layout','neon-control-side'])
  assert.ok(html.includes('id="'+id+'"'),id+' must be mounted in the HUD');
assert.ok(!html.includes('id="astra-switch-spell"'), 'Mobile spell switching is replaced by direct skills');
assert.ok(html.indexOf('js/ships.generated.js')>html.indexOf('js/ships.js'));
assert.ok(html.indexOf('js/ships.generated.js')<html.indexOf('js/core.js'));
const generated = fs.readFileSync(root+'js/ships.generated.js','utf8');
assert.ok(generated.indexOf('ships/astra/abilities.js')<generated.indexOf('ships/astra/weapons.js'));
assert.ok(generated.indexOf('ships/astra/weapons.js')<generated.indexOf('ships/astra/upgrades.js'));
const actions=[];
const window={addEventListener(){},NeonShips:{
  runAbility(pilot,hook,game,request){actions.push({pilot,hook,request});return true;}
}};
const context={window,console,
  document:{getElementById(){return null;}},
  navigator:{getGamepads(){return [];}},
  localStorage:{getItem(){return null;},setItem(){}},
  performance:{now:()=>1000},setTimeout,clearTimeout,setInterval,clearInterval};
vm.createContext(context);
vm.runInContext(fs.readFileSync(root+'js/core.js','utf8'),context);
const proto=vm.runInContext('NeonSurvivorGame.prototype',context);
const game=Object.create(proto);
game.player={shipId:'astra',hp:95,downed:false,aimAngle:0};
game.keys={};game.touch={active:false};game.gamepadMove={x:0,y:0};
game.state='playing';
assert.equal(game.castAstraMeteor(),true);
assert.equal(actions.at(-1).request,'meteor');
assert.equal(game.castAstraWard(),true);
assert.equal(actions.at(-1).request,'ward');
game.triggerDash();
assert.ok(['warp', 'blink'].includes(actions.at(-1).request.kind));
assert.equal(actions.at(-1).request.direction.x,1);
game.state='levelup';
assert.equal(game.castAstraMeteor(),false,'Upgrade screens block spell input');
assert.equal(game.castAstraWard(),false);
const count=actions.length;
game.triggerDash();
assert.equal(actions.length,count,'No magic blink during the upgrade screen');
game.state='playing';game.player.shipId='riftblade';
assert.equal(game.castAstraMeteor(),false,'Riftblade cannot cast Astra spells');
console.log('Astra controls passed: direct spell keys, class blink and menu input isolation.');
