/* Run: node tests/neon-survivor-responsive.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const css = fs.readFileSync(root + 'css/game.css', 'utf8');
const core = fs.readFileSync(root + 'js/core.js', 'utf8');
assert.match(html, /viewport-fit=cover/);
assert.match(css, /@media \(orientation: portrait\) and \(max-width: 900px\)/);
assert.match(css, /@media \(orientation: landscape\) and \(max-height: 650px\)/);
assert.match(css, /@media \(max-height: 420px\)/);
assert.match(css, /env\(safe-area-inset-(top|bottom|left|right)/);
assert.match(css, /#modal-levelup \.upgrade-grid/);
assert.match(css, /\.neon-settings-card/);
assert.match(css, /max-height: calc\(100dvh/);
assert.match(css, /--neon-dash-size/);
assert.match(css, /#boss-hud/);
assert.match(html, /id="btn-fullscreen"/, 'Fullscreen button is always in the shared HUD');
assert.doesNotMatch(css, /#hud\s+#btn-fullscreen[^{}]*\{\s*display:\s*none\s*!important/,
  'No mobile breakpoint may hide fullscreen');
assert.match(css, /#hud #btn-fullscreen, #hud #btn-settings, #hud #btn-pause/,
  'Portrait fullscreen uses the same accessible HUD button size');
assert.match(css, /\.hud-btn, #hud #btn-fullscreen, #hud #btn-settings/,
  'Landscape fullscreen uses the same accessible HUD button size');
assert.doesNotMatch(html, /id="btn-aim"/, 'Obsolete aim toggle should not take HUD space');
const legacyPos = css.indexOf('@media (max-width: 640px)');
const adaptivePos = css.indexOf('/* Fluid layout for narrow devices');
assert.ok(adaptivePos > legacyPos, 'Adaptive media rules must override legacy phone rules');
assert.match(core, /ctx\.scale\(Math\.max\(0\.65/);
assert.match(core, /const zoom = Math\.max\(0\.65, Math\.min\(1\.5, this\.cameraZoom \|\| 1\)\)/);
assert.match(core, /window\.NeonGameSettings\?\.apply\(this\); \/\/ Restore per-device preferences on every restart/);

const ctxOps = [];
const ctx = {
  save() {}, restore() {}, clearRect() {}, fillRect() {}, beginPath() {},
  arc() {}, fill() {}, stroke() {}, translate(...args) { ctxOps.push(['translate',...args]); },
  scale(...args) { ctxOps.push(['scale',...args]); }, setTransform() {},
  fillText() {}, moveTo() {}, lineTo() {}, closePath() {}, rotate() {}, setLineDash() {}
};
const sandbox = {
  window: {}, console, navigator: { getGamepads: () => [] },
  document: { getElementById: () => null }, performance: { now: () => 0 }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + 'js/network/world-view.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(root + 'js/network/coop.js', 'utf8'), sandbox);
const coop = new sandbox.window.NeonLanCoop.Coop({
  width: 390, height: 844, dpr: 1, cameraZoom: 1.35, ctx,
  render() {
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.camera.x, -this.camera.y);
  },
  updateHUD() {},
  renderWeaponsHUD() {},
  modalLevelup: { classList: { add() {}, remove() {} } }
}, { connected: true, role: 'guest' });
coop.guestMode = true;
coop.latest = {
  type: 'snapshot', time: 5, kills: 2, phase: 'playing',
  host: { x: 100, y: 100, hp: 100, maxHp: 100 },
  guest: { x: 30, y: 40, hp: 70, maxHp: 100, charges: 3 },
  enemies: [], bullets: [], enemyBullets: [], gems: [], teamXP: { level: 1, xp: 0, xpNeeded: 10 }
};
coop.renderGuest();
assert.ok(ctxOps.some(op => op[0] === 'scale' && op[1] === 1.35 && op[2] === 1.35),
  'Guest view respects device-local camera zoom');
ctxOps.length = 0;
coop.game.width = 844;
coop.game.height = 390;
coop.game.cameraZoom = 0.75;
coop.renderGuest();
assert.ok(ctxOps.some(op => op[0] === 'scale' && op[1] === 0.75 && op[2] === 0.75),
  'Guest zoom survives portrait-to-landscape resize without resetting');
console.log('Neon Survivor responsive passed: fluid portrait/landscape rules, safe areas and independent guest camera zoom.');
