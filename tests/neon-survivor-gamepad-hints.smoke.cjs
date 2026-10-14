/* Run: node tests/neon-survivor-gamepad-hints.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root+'index.html','utf8');
const css = fs.readFileSync(root+'css/game.css','utf8');
assert.ok(html.includes('/js/gamepad-hints.js'));
assert.ok(html.indexOf('/js/gamepad-hints.js') < html.indexOf(neonCore.coreScriptPaths()[0]));
assert.match(css, /\.neon-gamepad-connected \.neon-gamepad-key/);
assert.match(css, /\.neon-gamepad-hint-row[\s\S]*display: none/);

const classes = new Set();
const attrTargets = [{
  attrs: { 'data-gamepad-action': 'rt' },
  getAttribute(key) {return this.attrs[key]},
  setAttribute(key,val) {this.attrs[key]=val}
}];
const document = {
  documentElement: {classList:{
    toggle(className,enabled) {if(enabled) classes.add(className); else classes.delete(className)}
  }},
  querySelectorAll(selector) {
    if(selector==='[data-gamepad-action]') return attrTargets;
    if(selector==='#upgrade-options .upgrade-card') return this.cards || [];
    return [];
  },
  getElementById() { return null },
  createElement(tag) {
    return {tag,textContent:'',className:'',children:[],
      append(...args){this.children.push(...args)}};
  },
  createTextNode(text) { return {text} }
};
const window = {addEventListener(){}};
const ctx = {window,document,console,
  navigator: {getGamepads() {return []}},
  performance:{now:()=>1000},localStorage:{getItem(){return null},setItem(){}},
  setTimeout,clearTimeout,setInterval,clearInterval};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'js/gamepad-hints.js','utf8'),ctx);
const hints = window.NeonGamepadHints;
assert.equal(hints.connected,false);
hints.sync({connected:true,id:'Xbox Controller'});
assert.equal(hints.connected,true);
assert.equal(hints.label('a'),'A');
assert.equal(attrTargets[0].attrs['data-gamepad-key'],'RT');
assert.ok(classes.has('neon-gamepad-connected'));
hints.sync({connected:true,id:'DualSense Wireless Controller'});
assert.equal(hints.label('a'),'×');
assert.equal(hints.label('rt'),'R2');
hints.sync({connected:true,id:'Nintendo Switch Pro Controller'});
assert.equal(hints.label('a'),'B');
assert.equal(hints.label('rt'),'ZR');
hints.sync(null);
assert.equal(hints.connected,false);
assert.ok(!classes.has('neon-gamepad-connected'),'Hints disappear when last pad disconnects');

neonCore.runCore(ctx);
const prototype = vm.runInContext('NeonSurvivorGame.prototype',ctx);
const game=Object.create(prototype);
game.state='levelup';
game.gamepadIndex=-1;
game.gamepadPrevButtons={};
game.gamepadSelectedUpgradeIdx=0;
game.gamepadNavTimer=0;
game.sound={playLaser(){}};
game.vibrateGamepad=()=>{};
game.finishGamepadMenuFrame=()=>{};
game.syncGamepadBadge=()=>{};
game.pendingUpgradeId=null;
game.endlessMode=false;
const actions=[];
const card={upgradeId:'power',style:{},classList:{contains(){return false}},
  click(){actions.push('preview');game.pendingUpgradeId='power'}};
document.cards=[card];
game.confirmUpgradePreview=()=>{actions.push('confirm');game.pendingUpgradeId=null;return true};
game.cancelUpgradePreview=()=>{actions.push('cancel');game.pendingUpgradeId=null;return true};
game.finishUpgradeSelection=()=>{actions.push('bank');return true};
let buttons=Array.from({length:18},()=>({pressed:false}));
let pad={id:'Xbox Controller',connected:true,index:0,axes:[0,0],
  buttons};
ctx.navigator.getGamepads=()=>[pad];
buttons[2].pressed=true;
game.pollGamepad(.016);
assert.deepEqual(actions,['preview','confirm'],
  'X must perform a real one-press confirm, not only preselect');
buttons[2].pressed=false;
buttons[1].pressed=true;
game.pollGamepad(.016);
assert.deepEqual(actions,['preview','confirm','cancel'],
  'B cancels only and must not accidentally bank upgrades');
buttons[1].pressed=false;
buttons[3].pressed=true;
game.pollGamepad(.016);
assert.equal(actions.at(-1),'bank','Y is a deliberate shortcut to save credits');

const readySrc=fs.readFileSync(root+'js/network/ready.js','utf8');
assert.match(readySrc, /pollGamepad\(coop, justPressed\)/);
assert.match(readySrc, /justPressed\(9\).*beginHostMatch/);
console.log('Gamepad prompts passed: connection-only display, platform labels, one-press X, safe B and Y bank.');
