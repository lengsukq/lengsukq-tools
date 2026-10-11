/* Run: node tests/neon-survivor-ui.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const listeners = {};
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.children = [];
    this.events = {};
    this.textContent = '';
    this.firstChild = null;
  }
  appendChild(child) {
    this.children.push(child);
    this.firstChild = this.children[0] || null;
    return child;
  }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) {
    this.children = [];
    this.firstChild = null;
    children.forEach(child => this.appendChild(child));
  }
  setAttribute() {}
  addEventListener(type, handler) { this.events[type] = handler; }
}
const document = { body: new Element('body'), createElement: tag => new Element(tag) };
const window = { addEventListener(type, handler) { listeners[type] = handler; } };
const sandbox = {
  document, window, console, performance: { now: () => 1000 }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/Game/neon-survivor/js/ui.js', 'utf8'), sandbox);
const ui = window.NeonRogueUI;
const game = {
  state: 'playing', endlessMode: true, bossCycle: 3, survivalTime: 615,
  endlessState: { relics: ['glass_reactor'], fusions: ['storm_lance'] },
  releaseJoystickTouch() { this.released = true; }
};
let picked = null;
const options = [
  { id: 'a', name: '相位猎手', desc: '精准折跃强化' },
  { id: 'b', name: '玻璃反应堆', desc: '输出与生命取舍' },
  { id: 'c', name: '重装弹仓', desc: '提升飞弹输出' }
];
assert.equal(ui.open(game, '三选一', options, card => { picked = card.id; }), true);
assert.equal(game.state, 'endless-choice');
assert.equal(game.released, true);
assert.equal(ui.active, true);
assert.equal(document.body.children.length, 2);
assert.equal(document.body.children[0].firstChild.children[2].children.length, 3);

ui.navigate(1);
ui.pollGamepad(game, button => button === 0, { axes: [0] });
assert.equal(picked, 'b');
assert.equal(game.state, 'playing');
assert.equal(game.gamepadCombatInputLocked, true);
assert.equal(ui.active, false);

picked = null;
ui.open(game, '路线选择', options, card => { picked = card.id; });
let stopped = false;
listeners.keydown({
  key: 'ArrowRight', preventDefault() {}, stopImmediatePropagation() { stopped = true; }
});
assert.equal(stopped, true);
listeners.keydown({
  key: 'Enter', preventDefault() {}, stopImmediatePropagation() {}
});
assert.equal(picked, 'b');
assert.equal(game.state, 'playing');

window.NeonRogueEndless = { getRoute: () => ({ name: '猎杀' }) };
window.NeonRogueEvents = { description: () => '清剿 4/35' };
ui.update(game);
assert.match(document.body.children[1].textContent, /遗物 1/);
assert.match(document.body.children[1].textContent, /清剿 4\/35/);
game.endlessMode = false;
ui.update(game);
assert.equal(document.body.children[1].style.display, 'none');

console.log('Neon Survivor V3 UI passed: reward selection, gamepad/keyboard isolation, HUD and route display.');
