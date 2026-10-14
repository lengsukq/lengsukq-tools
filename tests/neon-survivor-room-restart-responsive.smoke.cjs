/* Run: node tests/neon-survivor-room-restart-responsive.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const neonCore = require('./helpers/neon-core.cjs');
const root = 'public/Game/neon-survivor/';
const calls = { mounted: 0, removed: 0, sent: [], profiles: [] };
const pause = {style:{display:'none'},dataset:{lanPreviousDisplay:'inline-flex'}};
const document = {
  body:{classList:{add(){},remove(){}}},
  getElementById(id){return id === 'btn-pause' ? pause : null;}
};
const ships = {
  get(id){return ['astra','phantom','riftblade'].includes(id) ? {id,playable:true,baseStats:{speed:240}} : null;},
  resolve(id){return this.get(id) || this.get('riftblade');},
  startingState(id){const s=this.get(id)||this.get('riftblade');
    return {shipId:s.id,hp:100,maxHp:100,baseSpeed:240,regen:.8,dashCharges:3,
      weapons:{blaster:1},passives:{}};},
  runAbility(){return true;}
};
const window = {NeonShips:ships};
const ctx = {window,document,console,performance:{now:()=>1000}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'js/players.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'js/network/schema.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'js/network/ready.js','utf8'),ctx);
window.NeonLanReady = {...window.NeonLanReady,mount(coop){
  calls.mounted++;
  coop.guestShipWaitPanel = {remove(){calls.removed++;}};
  coop.refreshReadyView = () => {};
}};
vm.runInContext(fs.readFileSync(root+'js/network/coop.js','utf8'),ctx);
const Coop = window.NeonLanCoop.Coop;
function game(state, ship) {
  return {state,selectedShipId:ship,player:{hp:100,x:0,y:0,xpNeeded:25},
    players:{remove(){},has(){return false;},register(){},replace(){}},
    hideAllModals(){},releaseJoystickTouch(){},
    modalLevelup:{classList:{remove(){}}}};
}
const hostGame = game('playing','riftblade');
const guestGame = game('lan-client','astra');
const hostRtc = {
  role:'host',connected:true,capacity:2,
  broadcastToGuests(packet){calls.sent.push(packet);return ['guest'];},
  send(packet){calls.sent.push(packet);return true;}
};
const guestRtc = {
  role:'guest',connected:true,capacity:2,localPlayerId:'guest',
  send(packet){calls.profiles.push(packet);return true;}
};
const host = new Coop(hostGame,hostRtc);
const guest = new Coop(guestGame,guestRtc);
hostGame.lanCoop = host;
guestGame.lanCoop = guest;
host.roundId = guest.roundId = 1;
host.ally={hp:90};
host.allies.set('guest',host.ally);
host.pendingGuestShipId='astra';
host.pendingShips.set('guest','astra');
host.pendingGuestProfile={name:'队友'};
guest.guestMode=true;
guest.latest={type:'snapshot',seq:51,round:1,guest:{x:1,y:2}};

// Quick restart preserves WebRTC and starts a new visual session on the guest.
assert.equal(host.restartHostMatch(),true);
assert.equal(calls.sent.at(-1).type,'match_restart');
assert.equal(calls.sent.at(-1).round,2);
guest.onMessage(calls.sent.at(-1));
assert.equal(guest.roundId,2);
assert.equal(guestGame.state,'lan-client');
assert.equal(guest.latest,null);
assert.equal(guest.guestMode,true);
assert.equal(hostRtc.connected,true);
function frame(round,seq) {
  return {type:'snapshot',round,seq,host:{x:0,y:0},guest:{x:3,y:4},
    enemies:[],bullets:[],enemyBullets:[],gems:[]};
}
guest.onMessage(frame(1,100));
assert.equal(guest.latest,null,'old round snapshots must be rejected after restart');
guest.onMessage(frame(2,101));
assert.equal(guest.latest?.seq,101);

// Returning to the hangar resets every peer to the ready room, not the room connection.
assert.equal(host.returnToReady(),true);
assert.equal(calls.sent.at(-2).type,'ready_reset');
assert.equal(hostGame.state,'lan-waiting');
assert.equal(host.awaitingGuestShip,true);
assert.equal(host.ally,null);
assert.equal(host.allies.size,0);
host.onMessage({type:'ready_update',seq:999,round:1,shipId:'astra',ready:true},'guest');
assert.equal(host.readyRoom.get('guest').ready,false,
  'late ready packets from the previous run must not make a guest ready');
guest.onMessage(calls.sent.at(-2));
assert.equal(guest.roundId,3);
assert.equal(guestGame.state,'lan-waiting');
assert.equal(guest.guestMode,false);
assert.equal(guest.localReady,false);
assert.equal(guest.latest,null);
assert.equal(pause.style.display,'inline-flex');
assert.equal(hostRtc.connected,true);
const roster = calls.sent.at(-1);
assert.equal(roster.type,'ready_roster');
guest.onMessage(roster);
assert.equal(guest.readyRevision,roster.revision);
assert.equal(guest.remoteReady.members.length,2);
assert.equal(host.returnToReady(),false,'second return must not reset the ready room again');

// The second round has an independent ready revision and round ID.
hostGame.startNewGame = () => {hostGame.state='playing';};
assert.equal(host.setReady(true),true);
assert.equal(guest.sendGuestReady(true),true);
host.onMessage(calls.profiles.at(-1),'guest');
const finalRoster=calls.sent.at(-1);
assert.equal(finalRoster.type,'ready_roster');
assert.equal(finalRoster.canStart,true,'both players have to prepare again');
guest.onMessage(finalRoster);
assert.equal(host.beginHostMatch(),true);
const newMatch=calls.sent.at(-1);
assert.equal(newMatch.type,'match_start');
assert.equal(newMatch.round,4);
guest.onMessage(newMatch);
assert.equal(guest.roundId,4);
assert.equal(guestGame.state,'lan-client');
assert.equal(guest.guestMode,true);
assert.equal(host.awaitingGuestShip,false);

const css = fs.readFileSync(root+'css/game.css','utf8');
const layoutStart = css.lastIndexOf('/* Final upgrade layout rules');
assert.ok(layoutStart > css.indexOf('/* Upgrade panel:'),
  'final upgrade rules must follow all old responsive rules, not be overwritten by them');
const latest = css.slice(layoutStart);
for (const snippet of [
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  'grid-template-columns: minmax(0, 1fr)',
  'grid-auto-rows: max-content',
  'grid-template-columns: clamp(40px, 4.7vw, 58px) minmax(0, 1fr)',
  'line-clamp: unset','overflow-y: auto','upgrade-card-info','upgrade-stat-text'
]) assert.ok(latest.includes(snippet),'responsive upgrade rules must contain '+snippet);
const html = fs.readFileSync(root+'index.html','utf8');
assert.match(html, /css\/game\.css\?v=state-contract-20261019/,
  'CSS must be cache-busted so users receive the updated layout');
const cssToken = (html.match(/css\/game\.css\?v=([^"']+)/) || [])[1];
assert.ok(cssToken, 'CSS must be cache-busted so users receive the updated layout');
assert.equal(neonCore.coreEntryTag().query, '?v=' + cssToken,
  'DOM generator must share the CSS cache version to avoid mixing incompatible markup');
assert.match(latest, /#modal-levelup \.upgrade-card-info \{/,
  'upgrade name, description, level, and stats must occupy the same right-hand column');
assert.match(latest, /#modal-levelup \.upgrade-card > \.upgrade-desc/,
  'cached legacy markup must not place upgrade details beneath the icon');
assert.ok(!latest.includes('line-clamp: 2') && !latest.includes('line-clamp: 3'),
  'final upgrade styles must not truncate descriptions');
const ui = fs.readFileSync(root+'js/network/ui.js','utf8');
assert.ok(ui.includes("back.onclick = closeLobby") && ui.includes("event.key !== 'Escape'"),
  'lobby needs an explicit back action and keyboard escape');
assert.ok(fs.readFileSync(root+'js/gamepad-menus.js','utf8').includes("#neon-lan-back"),
  'controller B uses the same lobby exit action');
const core = neonCore.coreSource();
assert.match(core,/class="upgrade-icon">\$\{upg.icon\}<\/div>\s*<div class="upgrade-card-info">/,
  'upgrade card must place icon on the left and descriptions in a shared right-side column');
assert.match(core,/<div class="upgrade-stat-text"[^>]*>⚡ \$\{nextText\}<\/div>/,
  'level-up effects must be visible alongside the ability description');
assert.ok(ui.includes("document.querySelector('#hud .hud-right')") &&
  ui.includes("leaveButton.className = 'hud-btn neon-lan-leave'") &&
  !ui.includes("position:fixed;top:70px"),
  'LAN disconnect should use the HUD action bar instead of covering mobile stats');
console.log('Co-op restart, re-ready, stale snapshots, lobby back and responsive upgrade checks passed.');
