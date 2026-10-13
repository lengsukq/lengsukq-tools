/* Run: node tests/neon-survivor-touch-coop-prediction.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const listeners = new Map();
const element = () => ({ style: {}, addEventListener(event, fn) { this[event] = fn; } });
const skillsBar = element();
skillsBar.contains = () => true;
const elements = {
  'touch-controls': element(),
  joystickBase: element(),
  joystickThumb: element(),
  'touch-dash-btn': element(),
  'ship-skills-bar': skillsBar
};
const window = { addEventListener(event, fn) { listeners.set(event, fn); },
  NeonShips: { get() { return {baseStats:{speed:240}}; } }
};
const context = {
  window, console, performance: {now: () => 1000},
  document: {documentElement:{classList:{add(){}}},getElementById(id){return elements[id] || null;}},
  navigator: {maxTouchPoints: 2, getGamepads(){return [];}},
  localStorage:{getItem(){return null;},setItem(){}},
  setTimeout, clearTimeout, setInterval, clearInterval
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(root+'js/core.js','utf8'), context);
const proto = vm.runInContext('NeonSurvivorGame.prototype',context);
const game = Object.create(proto);
game.state = 'playing';
game.touch = {active:true, identifier:1};
const casts = [];
for (const fn of ['castAstraWard','castAstraMeteor','triggerPhantomVortex','togglePhantomDock','triggerDash']) {
  game[fn] = () => casts.push(fn);
}
game.setupTouchControls();
const press = (id, state) => {
  game.state = state;
  const btn = {id,dataset:{}};
  let prevented = false, stopped = false;
  skillsBar.touchstart({
    target:{closest(){return btn;}},
    preventDefault(){prevented=true;},
    stopPropagation(){stopped=true;}
  });
  if (prevented) {
    assert.equal(game.isDuplicateCombatSkillClick({currentTarget:btn,detail:1}),true,
      'the synthetic click after touchstart must not cause a second cast');
    assert.equal(game.isDuplicateCombatSkillClick({currentTarget:btn,detail:0}),false,
      'keyboard activation remains available');
  }
  return {prevented,stopped};
};
assert.deepEqual(press('btn-skill-ward','playing'),{prevented:true,stopped:true});
assert.deepEqual(press('btn-skill-meteor','playing'),{prevented:true,stopped:true});
assert.deepEqual(press('btn-skill-reap','playing'),{prevented:true,stopped:true});
assert.deepEqual(press('btn-skill-dock','lan-client'),{prevented:true,stopped:true});
assert.deepEqual(press('btn-skill-blink','playing'),{prevented:true,stopped:true});
assert.equal(press('btn-skill-ward','levelup').prevented,false);
assert.deepEqual(casts,[
  'castAstraWard','castAstraMeteor','triggerPhantomVortex','togglePhantomDock','triggerDash'
], 'touchstart dispatches each tactical skill while movement joystick is held');

vm.runInContext(fs.readFileSync(root+'js/network/prediction.js','utf8'),context);
const prediction=window.NeonLanPrediction;
const guest={shipId:'riftblade', level:1, passives:{},charges:3};
let visual=prediction.create(0,0);
prediction.sent(visual,1,100);
prediction.advance(visual,guest,{dx:1,dy:0},.05,150);
assert.ok(visual.x>11 && visual.x<13,'local movement happens before host snapshot');
const before=visual.x;
prediction.reconcile(visual,{...guest,x:32,y:0,lastSeq:1},165);
assert.equal(visual.x,before,'small errors must not instantly teleport pilot on snapshot');
prediction.advance(visual,guest,{dx:1,dy:0},.016,181);
assert.ok(visual.x>before,'per-frame prediction continues during correction');
assert.ok(visual.correctionX>0,'authoritative discrepancy is eased on render frames');
prediction.reconcile(visual,{...guest,x:1200,y:0,lastSeq:2},210);
assert.ok(visual.x>1000,'large teleports and respawns snap rather than dragging');
assert.equal(prediction.dash(visual,{...guest,charges:0},300),false);
assert.equal(prediction.dash(visual,guest,300),true);
assert.equal(visual.dashUntil,480);
const beforeDash=visual.x;
prediction.advance(visual,guest,{dx:1,dy:0},.05,310);
assert.ok(visual.x-beforeDash>38,'local dash prediction uses host dash speed');
console.log('Touch skills and guest movement prediction passed.');
