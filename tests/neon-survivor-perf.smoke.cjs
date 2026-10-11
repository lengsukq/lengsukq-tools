/* Run: node tests/neon-survivor-perf.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('public/Game/neon-survivor/index.html', 'utf8');
assert.ok(html.indexOf('/js/network/perf.js') < html.indexOf('/js/network/coop.js'));
const code = fs.readFileSync('public/Game/neon-survivor/js/network/perf.js', 'utf8');
const nodes = [];
let now = 1000;
const root = {
  window: { location: { search: '' } },
  document: { body: { appendChild(node) { nodes.push(node); } },
    createElement() { return { style: {}, setAttribute() {}, remove() { this.removed = true; } }; } },
  performance: { now: () => now },
  console
};
vm.createContext(root);
vm.runInContext(code, root);
assert.equal(root.window.NeonLanPerf.create({ dpr: 2 }), null,
  'Normal gameplay must have zero diagnostic UI overhead');
assert.equal(nodes.length, 0);
root.window.location.search = '?room=ABCD&perf=1';
const observer = root.window.NeonLanPerf.create({ dpr: 1.5 });
assert.ok(observer && nodes.length === 1);
for (let i = 0; i < 60; i++) {
  now += 17;
  if (!(i % 4)) observer.packet(now - 2);
  observer.frame(now - 3, now);
}
assert.match(nodes[0].textContent, /联机 FPS/);
assert.match(nodes[0].textContent, /渲染CPU/);
assert.match(nodes[0].textContent, /快照/);
assert.match(nodes[0].textContent, /DPR 1\.50/);
observer.destroy();
assert.equal(nodes[0].removed, true);
console.log('Opt-in FPS diagnostics passed: hidden by default, aggregates frame CPU, packets and DPR.');
