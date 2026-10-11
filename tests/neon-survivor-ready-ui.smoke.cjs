/* Run: node tests/neon-survivor-ready-ui.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('public/Game/neon-survivor/index.html', 'utf8');
const css = fs.readFileSync('public/Game/neon-survivor/css/game.css', 'utf8');
assert.ok(html.includes('/js/network/ready.js'), 'Ready module loads before Coop');
assert.ok(html.indexOf('/js/network/ready.js') < html.indexOf('/js/network/coop.js'));
for (const token of ['.neon-ready-overlay', '.neon-ready-member', '.neon-ready-start',
  'env(safe-area-inset-top)', '.neon-ready-leave']) assert.ok(css.includes(token),token);

const elements = new Map();
const el = tag => {
  const node = {
    tag, children: [], style: {}, className: '', disabled: false,
    hidden: false, value: '', textContent: '',
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
    setAttribute(key,value) { this[key] = value; },
    remove() { this.removed = true; if (elements.get(this.id) === this) elements.delete(this.id); },
    get options() { return this.children; }
  };
  let id = '';
  Object.defineProperty(node,'id',{
    get() { return id; },
    set(value) { id=value; elements.set(value,node); }
  });
  return node;
};
const document = {
  createElement: el, getElementById: id => elements.get(id) || null,
  body: el('body')
};
const ships = [
  {id:'riftblade',name:'裂锋·虚空突击者',description:'高速突击',playable:true},
  {id:'astra',name:'星织·织界术师',description:'法师战舰',playable:false}
];
const ctx = { window: {
  NeonShips: {get: id => ships.find(s=>s.id===id), list:()=>ships}
}, document, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('public/Game/neon-survivor/js/network/ready.js','utf8'),ctx);
const room = new ctx.window.NeonLanReady.ReadyRoom();
const actions = [];
const coop = {
  game:{selectedShipId:'riftblade'},
  rtc:{role:'host',connected:true},
  readyRoom:room,localReady:false,
  setReady(value) { actions.push(['ready',value]); this.localReady=value;
    room.set('host',{ready:value}); this.refreshReadyView(); return true; },
  selectReadyShip(id) { actions.push(['ship',id]);return true; },
  beginHostMatch() { actions.push(['start']);return room.canStart(); },
  onReadyLeave() { actions.push(['leave']); }
};
ctx.window.NeonLanReady.mount(coop);
const panel = elements.get('neon-lan-ready');
const selector = elements.get('neon-ready-ship');
assert.ok(panel,'Ready panel exists');
assert.equal(selector.options.length,2);
assert.equal(selector.options[1].disabled,true,'Locked prototype cannot be chosen');
const findButtons = n => {
  const found=[];const recurse=x=>{if(x.tag==='button')found.push(x);
    for(const child of x.children||[])recurse(child)};
  recurse(n);return found;
};
let buttons = findButtons(panel);
const start = buttons.find(b=>b.className==='neon-ready-start');
const ready = buttons.find(b=>b.className==='neon-ready-toggle');
const leave = buttons.find(b=>b.className==='neon-ready-leave');
assert.equal(start.disabled,true,'Host cannot start an unready room');
ready.onclick();
assert.deepEqual(actions.at(-1),['ready',true]);
assert.equal(start.disabled,true,'Guest has not prepared');
room.set('guest',{connected:true,ready:true,shipId:'riftblade',name:'队友'});
coop.refreshReadyView();
assert.equal(start.disabled,false,'All-ready allows manual start');
start.onclick();
assert.deepEqual(actions.at(-1),['start']);
assert.equal(selector.disabled,true,'Ready pilot locks its own ship choice');
ready.onclick();
assert.equal(selector.disabled,false);
selector.onchange();
assert.deepEqual(actions.at(-1),['ship','riftblade']);
leave.onclick();
assert.deepEqual(actions.at(-1),['leave']);
coop.rtc.role='guest';
coop.remoteReady=room.snapshot();
coop.readyRoom=null;
coop.refreshReadyView();
assert.equal(start.hidden,true,'Guest never receives a Start action');
console.log('Ready UI passed: responsive structure, locked ship, host-only launch, toggle and leave.');
