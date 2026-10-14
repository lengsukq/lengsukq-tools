/* Run: node tests/neon-survivor-four-player.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/';
const allShips = new Map([['riftblade', {id:'riftblade',name:'裂锋',playable:true}]]);
const shipments = [];
const registry = new Map();
const game = {
  state:'menu', player: {id:'host',shipId:'riftblade',x:0,y:0,hp:100,
    maxHp:100,level:1,weapons:{blaster:1}, passives:{}},
  selectedShipId:'riftblade', survivalTime:4, kills:0,difficulty:0,
  enemies:[],bullets:[],enemyBullets:[],gems:[],shockwaves:[],particles:[],
  texts:[],dashTrails:[],laserBeams:[],mines:[],blackHoles:[],
  lightningTethers:[],orbiters:[],companionDrones:[],
  startNewGame() {this.state='playing';},gameOver(){this.state='gameover';},
  players: {has(id){return registry.has(id)},register(id,p){registry.set(id,p)},
    replace(id,p){registry.set(id,p)},remove(id){registry.delete(id)},
    list(){return [...registry].map(([id,state])=>({id,state}))}}
};
registry.set('host',game.player);
const window = {
  NeonShips: {get(id){return allShips.get(id)},resolve(){return allShips.get('riftblade')},
    runAbility(){}},
  NeonPlayers:{validId(id){return ['host','guest','guest-2','guest-3'].includes(id)},
    createRemotePilot(_,id,shipId) {
      return {id,shipId,x:20,y:0,hp:100,maxHp:100,level:1,
        weapons:{blaster:1},passives:{},dashUpgrades:{},limitBreaks:{},timers:{},
        pendingUpgrades:0,choices:[],pickedUpgradeIds:[],upgradeFinished:true,
        lastSeq:-1,lastInputAt:0,charges:3,maxCharges:3,dmgMultiplier:1,
        areaMultiplier:1,cdrMultiplier:1,radius:16,
        input:{dx:0,dy:0,aim:0,dash:false}};
    }},
  NeonPilotSystem:{inputFor(p){return p.input},stepRemote(_,p,input,dt){
    p.x+=input.dx*240*dt;p.y+=input.dy*240*dt;
  },resolveRemoteHits(){}},
  NeonWeaponSystem:{update(){}},
  NeonLanMultiRules:{tick(){},summary(){return {deaths:0,totalHoldSeconds:0,fallen:[]}}},
  NeonLanResonance:{link(){return {damageBonus:0}},update(){},remainingShield(){return 0}},
  NeonLanRevive:{newRun(){return null},summary(){return null}},
  NeonLanExperience:{progress(g){return {xp:0,xpNeeded:1,level:g.player.level}}}
};
const peers = new Map(['guest','guest-2','guest-3'].map(id=>[id,{control:{readyState:'open'}}]));
const rtc = {
  role:'host',connected:true,capacity:4,
  peers:{get(id){return peers.get(id)}},
  broadcastToGuests(payload){for(const id of peers.keys()) shipments.push({id,payload});
    return [...peers.keys()]},
  sendTo(id,payload){shipments.push({id,payload});return peers.has(id)},
  send(payload){return this.sendTo('guest',payload)}
};
const context={window,console,performance:{now:()=>500},
  document:{getElementById(){return null},body:{classList:{remove(){}}}}};
vm.createContext(context);
for (const file of ['network/ready','network/snapshots','network/coop']) {
  vm.runInContext(fs.readFileSync(root+file+'.js','utf8'),context);
}
window.NeonLanReady={...window.NeonLanReady,mount(coop){
  coop.guestShipWaitPanel={remove(){}};
  coop.refreshReadyView=()=>{};
}};
const coop=new window.NeonLanCoop.Coop(game,rtc);
game.lanCoop=coop;
assert.equal(coop.awaitGuestShip(),true);
assert.equal(coop.readyRoom.capacity,4);
for(const id of peers.keys()){
  coop.onMessage({type:'profile',name:id,shipId:'riftblade'},id);
  coop.onMessage({type:'ready_update',ready:true,shipId:'riftblade',seq:0},id);
}
coop.setReady(true);
assert.equal(coop.readyRoom.canStart(),true);
assert.equal(coop.beginHostMatch(),true);
assert.equal(game.state,'playing');
assert.equal(coop.allies.size,3);
assert.equal(registry.size,4);
assert.notEqual(coop.allies.get('guest'),coop.allies.get('guest-2'));
const movement=[
  ['guest',1,0],['guest-2',0,1],['guest-3',-1,0]
];
for(const [id,dx,dy] of movement) {
  coop.onMessage({type:'input',seq:1,dx,dy,aim:0,dash:false},id);
}
assert.equal(coop.allies.get('guest').input.dx,1);
assert.equal(coop.allies.get('guest-2').input.dy,1);
assert.equal(coop.allies.get('guest-3').input.dx,-1);
// A guest cannot operate someone else's ship by inserting an ID in the JSON.
coop.onMessage({type:'input',seq:2,dx:0,dy:1,aim:0,dash:false,
  playerId:'guest-3'},'guest-2');
assert.equal(coop.allies.get('guest-3').input.dx,-1);
coop.updateHost(.1);
assert.ok(coop.allies.get('guest').x>20);
assert.ok(coop.allies.get('guest-2').y>0);
assert.ok(coop.allies.get('guest-3').x<20);
const frames=shipments.filter(item=>item.payload.type==='snapshot');
assert.equal(frames.length,3,'Host must send a distinct snapshot to each peer');
for(const frame of frames){
  assert.equal(frame.payload.localPlayerId,frame.id);
  assert.equal(frame.payload.players.length,4);
  assert.equal(frame.payload.guest.x,coop.allies.get(frame.id).x);
  assert.ok(JSON.stringify(frame.payload).length<=window.NeonLanCoop.SNAPSHOT_LIMIT);
}
// All remote players must receive individual upgrade drafts and all of them
// must complete/retain choices before the shared world can resume.
game.state='levelup';
game.getCoopUpgradeChoices=()=>['power'];
game.upgradeSession=null;
for(const pilot of coop.allies.values()){
  pilot.pendingUpgrades=1;
  pilot.upgradeFinished=true;
  pilot.upgradeRound=0;
}
coop.prepareGuestUpgrade();
for(const pilot of coop.allies.values()) {
  assert.equal(pilot.upgradeFinished,false);
  assert.equal(pilot.choices[0],'power');
}
assert.equal(coop.waitForGuestUpgrade(),true);
assert.equal(game.state,'coop-guest-upgrade');
for(const id of ['guest','guest-2']){
  coop.onMessage({type:'upgrade_done',seq:10},id);
  assert.equal(game.state,'coop-guest-upgrade',
    'One remaining pilot must keep the entire world paused');
}
coop.onMessage({type:'upgrade_done',seq:10},'guest-3');
assert.equal(game.state,'playing','Only the final pilot can release the paused team');
for(const pilot of coop.allies.values())assert.equal(pilot.upgradeFinished,true);
coop.onPeerDisconnected('guest-2');
assert.equal(coop.allies.get('guest-2').disconnected,true);
assert.equal(coop.allies.get('guest').disconnected,false);
assert.equal(coop.allies.get('guest-3').disconnected,false);
console.log('Four-player room passed: three peer-bound inputs, four players, distinct authoritative snapshots and isolated disconnect.');
