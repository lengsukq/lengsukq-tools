/* Run with node tests/mini-games.smoke.cjs (no browser or test framework needed). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(file) {
  const html = fs.readFileSync('public/Game/' + file, 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<meta name="viewport"/);
  assert.doesNotMatch(html, /<script[^>]+src=/i, 'Game must work as one standalone HTML');
  const nodes = new Map();
  const frameCallbacks = [];
  const windowEvents = {};
  function element(id = '') {
    const events = {};
    const classes = new Set();
    const style = {setProperty(key,value) { this[key] = value; }};
    const item = {
      id, style, events, dataset: {}, children: [], hidden: id === 'next',
      classList: {
        add(v) { classes.add(v); }, remove(v) { classes.delete(v); },
        contains(v) { return classes.has(v); }
      },
      addEventListener(type, fn) { events[type] = fn; },
      click() { events.click?.(); item.onclick?.(); },
      append(...elements) { item.children.push(...elements); },
      appendChild(child) { item.children.push(child); },
      replaceChildren(...elements) { item.children = elements; },
      setAttribute(k,v) { item[k] = v; },
      getBoundingClientRect() { return {left:0,top:0,width:800,height:700}; },
      animate() {}, focus() {}, setPointerCapture() {}, remove() {}
    };
    return item;
  }
  const canvasContext = new Proxy({}, {
    get(target, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => ({addColorStop() {}});
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) { target[property] = value; return true; }
  });
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, element(id));
      return nodes.get(id);
    },
    querySelector(selector) {
      if (selector === '.dispatch') return document.getElementById('dispatch');
      if (selector.startsWith('#')) return document.getElementById(selector.slice(1));
      return null;
    },
    createElement: () => element()
  };
  document.getElementById('board').getContext = () => canvasContext;
  document.getElementById('sea').getContext = () => canvasContext;
  const storage = new Map();
  const window = {
    addEventListener(type, fn) { windowEvents[type] = fn; }
  };
  const sandbox = {
    document, window, console, Math, Date,
    localStorage: {getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,String(v))},
    performance: {now: () => 0},
    requestAnimationFrame(callback) {frameCallbacks.push(callback); },
    setTimeout() {},
  };
  vm.createContext(sandbox);
  const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length, 1, 'Each game must have one self-contained script');
  new vm.Script(matches[0][1], {filename:file});
  vm.runInContext(matches[0][1], sandbox);
  function frames(n,start=0,dt=16) {
    for(let i=0;i<n;i++){
      const cb=frameCallbacks.shift();
      assert.ok(cb,'Animation frame must continue to be scheduled');
      cb(start+(i+1)*dt);
    }
  }
  return {html,nodes,storage,frameCallbacks,frames,windowEvents,$:document.getElementById.bind(document)};
}

const prism=harness('prism_garden.html');
prism.frames(5);
assert.match(prism.$('levelName').textContent,/晨雾/);
for(let level=0;level<4;level++){
  // Hint is a deterministic way to solve each verified layout.
  for(let turn=0;turn<7&&prism.$('next').hidden;turn++)prism.$('hint').click();
  assert.equal(prism.$('next').hidden,false,'Prism level '+(level+1)+' must be solvable');
  assert.match(prism.$('boardStatus').textContent,/苏醒/);
  if(level<3)prism.$('next').click();
}
assert.equal(prism.storage.get('prism_garden_solved'),'4','All gardens must persist completion');
prism.$('next').click();
assert.match(prism.$('levelName').textContent,/晨雾/);

const abyss=harness('abyss_glimmer.html');
abyss.frames(4);
assert.equal(abyss.$('overlay').hidden,false);
abyss.$('play').click();
assert.equal(abyss.$('overlay').hidden,true,'Submarine play button must start');
const initialOxygen=abyss.$('oxygenText').textContent;
abyss.frames(80,64);
assert.notEqual(abyss.$('oxygenText').textContent,initialOxygen,'Oxygen must drain during play');
abyss.windowEvents.keydown({code:'Space',preventDefault() {}});
abyss.frames(10,1500);
abyss.windowEvents.keyup({code:'Space'});
abyss.$('pause').click();
assert.equal(abyss.$('overlay').hidden,false,'Pause must show overlay');
abyss.$('play').click();
assert.equal(abyss.$('overlay').hidden,true,'Resume should dismiss overlay');

const post=harness('cloud_postoffice.html');
post.frames(2);
post.$('start').click();
assert.equal(post.$('modal').hidden,true);
const boxes=post.$('mailboxes').children;
assert.equal(boxes.length,3,'Three distinct destinations');
const lookup={'月亮湾':0,'太阳坡':1,'星星岛':2};
const trueTarget=lookup[post.$('address').textContent];
boxes[(trueTarget+1)%3].click();
assert.equal(post.$('life').textContent,'♥ ♥','Wrong mailbox must consume a heart');
boxes[trueTarget].click();
assert.match(post.$('done').textContent,/01 \/ 18/);
post.$('pause').click();
assert.equal(post.$('modal').hidden,false);
post.$('start').click();
assert.equal(post.$('modal').hidden,true);
for(let i=1;i<18;i++){
  const target=lookup[post.$('address').textContent];
  assert.ok(target!==undefined,'All letters have valid destination');
  boxes[target].click();
}
assert.equal(post.$('modal').hidden,false,'All 18 letters trigger win overlay');
assert.match(post.$('modalTitle').textContent,/抵达/);
assert.ok(post.storage.has('cloud_postoffice_best'),'Score is persisted');

console.log('Mini-games smoke tests passed: 4 prism puzzles, submarine controls/oxygen/pause, postal routing/health/victory.');
