/* Run: node tests/neon-survivor-gamepad-navigation.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const context = {window: {}, document: {querySelector: () => null}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(root + 'js/gamepad-menus.js', 'utf8'), context);
const move = context.window.NeonGamepadMenus.gridMove;
for (const [start,count,dx,dy,expected] of [
  [0,6,1,0,1], [1,6,0,1,4], [4,6,0,-1,1],
  [2,5,0,1,4], [4,5,0,-1,1], [3,5,-1,0,4],
  [0,5,-1,0,2], [0,5,0,-1,3], [1,3,0,1,1]
]) assert.equal(move(start,count,dx,dy), expected, `Grid from ${start}, ${dx}, ${dy}`);
const html = fs.readFileSync(root + 'index.html', 'utf8');
const css = fs.readFileSync(root + 'css/game.css', 'utf8');
const core = fs.readFileSync(root + 'js/core.js', 'utf8');
const guest = fs.readFileSync(root + 'js/network/coop.js', 'utf8');
assert.match(css, /#modal-levelup \.upgrade-grid\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /\.neon-touch-enabled\[data-neon-control-layout="arc"\]/);
assert.match(html, /id="neon-control-layout"/);
assert.match(html, /id="neon-control-side"/);
assert.match(html, /js\/gamepad-menus\.js/);
assert.match(core, /gamepadSelectedUpgradeIdx = window\.NeonGamepadMenus\?\.gridMove/);
assert.match(guest, /guestSelectionIdx = window\.NeonGamepadMenus\?\.gridMove/);
console.log('Controller spatial 3-column navigation, two touch layouts, handedness and shared host/guest mapping passed.');
