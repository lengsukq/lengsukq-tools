/* Run: node tests/neon-survivor-four-player-live.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const prefix = 'public/Game/neon-survivor/js/';
const deliveries = new Map();
const window = {
  NeonShips: {
    get(id) {return id==='riftblade' ? {id,playable:true} : null},
    resolve() {return {id:'riftblade'}},
    startingState() {return {shipId:'riftblade',hp:100,maxHp:100,
      baseSpeed:240,regen:.8,dashCharges:3,weapons:{blaster:1},passives:{}}},
    runAbility() {}
  },
  NeonWeaponSystem:{update(){}},
  NeonPilotSystem:{
    inputFor(p) {return p.input},
    stepRemote(game,p,input,dt) {p.x += (input.dx||0)*240*dt},
    resolveRemoteHits(){}
  },
  NeonLanResonance:{
    update(){},
    remainingShield(){return 0}
  },
  NeonLanMultiRules:{tick(){},summary(){return {fallen:[],downedCount:0}}},
  NeonLanReady:null
};
const doc={getElementById(){return null},body:{classList:{add(){},remove(){}}}};
const ctx={window,document:doc,console,performance:{now:()=>1000}};
vm.createContext(ctx);
for(const file of ['players','network/ready','network/snapshots','network/coop']) {
  vm.runInContext(fs.readFileSync(prefix+file+'.js','utf8'),ctx);
}
window.NeonLanReady={...window.NeonLanReady,mount(coop){
  coop.guestShipWaitPanel={remove(){}};
  coop.refreshReadyView=()=>{};
}};
for(const capacity of [2,3,4]) {
  const ids=['guest','guest-2','guest-3'].slice(0,capacity-1);
  const sent=[];
  const rtc={role:'host',capacity,connected:true,peers:{
    get(id){return ids.includes(id)?{control:{readyState:'open'}}:null}
  },
  broadcastToGuests(packet){sent.push(packet);return [...ids]},
  sendTo(id,frame){assert.ok(ids.includes(id));sent.push({id,frame});return true},
  send(packet){sent.push(packet);return true}};
  const game={
    state:'menu',player:{id:'host',shipId:'riftblade',x:0,y:0,hp:100,maxHp:100,
      weapons:{blaster:1},passives:{},level:1,xp:0,xpNeeded:25},
    selectedShipId:'riftblade',survivalTime:2,kills:0,difficulty:0,
    enemies:[],bullets:[],enemyBullets:[],gems:[],shockwaves:[],particles:[],
    lightningTethers:[],blackHoles:[],mines:[],laserBeams:[],companionDrones:[],
    orbiters:[],dashTrails:[],texts:[],players:new window.NeonPlayers.PlayerRegistry(),
    startNewGame(){this.state='playing';},
    showStartMenu(){},modalLevelup:{classList:{remove(){}}}
  };
  game.players.register('host',game.player);
  const Coop=window.NeonLanCoop.Coop;
  const coop=new Coop(game,rtc);
  game.lanCoop=coop;
  coop.awaitGuestShip();
  for(const [i,id] of ids.entries()) {
    coop.onMessage({type:'profile',name:id,shipId:'riftblade'},id);
    coop.onMessage({type:'ready_update',seq:0,shipId:'riftblade',ready:true},id);
  }
  assert.equal(coop.readyRoom.canStart(),false,'Host must also confirm');
  coop.setReady(true);
  assert.equal(coop.readyRoom.canStart(),true,'All seats have committed');
  assert.equal(coop.beginHostMatch(),true);
  assert.equal(game.players.size,capacity);
  assert.equal(coop.allies.size,capacity-1);
  const focus = ids.at(-1);
  coop.onMessage({type:'input',seq:1,dx:1,dy:0,aim:0,dash:false},focus);
  // Sender identity, not arbitrary payload.id, determines who can move.
  coop.onMessage({type:'input',seq:1,dx:-1,dy:0,aim:0,
    playerId:ids[0],dash:false},focus);
  const previous=coop.allies.get(focus).x;
  coop.updateHost(.11);
  assert.ok(coop.allies.get(focus).x>previous,focus+' must move on host authority');
  if(ids.length>1) assert.equal(coop.allies.get(ids[0]).x,60,
    'Another guest cannot accidentally inherit the input');
  const frames=sent.map(p=>p.frame ? p : {id:'guest',frame:p})
    .filter(p=>p.frame?.type==='snapshot');
  assert.equal(frames.length,ids.length);
  for(const {id,frame} of frames) {
    assert.equal(frame.localPlayerId,id,'Every packet has its own camera identity');
    assert.equal(frame.guest.shipId,'riftblade');
    assert.equal(frame.players.length,capacity,
      'Every guest can see all authoritative ships');
  }
}
console.log('Multiplayer authority passed: 2/3/4-player room, separate pilot inputs and seat-specific snapshots.');
