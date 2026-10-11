/* Run: node tests/neon-survivor-four-ready-clients.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const env = {console, performance:{now:()=>400},
  document:{getElementById(){return null},body:{classList:{add(){},remove(){}}}}};
const ships = {
  get(id) {return id==='riftblade'?{id,playable:true}:null},
  resolve(){return {id:'riftblade',playable:true}}
};
const playerData = {
  createRemotePilot(_,id,shipId) {
    return {id,shipId,x:0,y:0,hp:100,maxHp:100,level:1,
      weapons:{blaster:1},passives:{},input:{dx:0,dy:0,dash:false},
      profile:{name:id},upgradeFinished:true};
  }
};
const window={NeonShips:ships,NeonPlayers:playerData};
env.window=window;
vm.createContext(env);
const root='public/Game/neon-survivor/js/network/';
for(const name of ['ready','coop'])
  vm.runInContext(fs.readFileSync(root+name+'.js','utf8'),env);
window.NeonLanReady={...window.NeonLanReady,mount(coop){
  coop.guestShipWaitPanel={remove(){}};
  coop.refreshReadyView=()=>{};
}};
const {Coop}=window.NeonLanCoop;
const ids=['guest','guest-2','guest-3'];
const clients=new Map();
const packets=[];
const hostGame={
  state:'menu',selectedShipId:'riftblade',
  player:{id:'host',shipId:'riftblade',hp:100,x:0,y:0},starts:0,
  startNewGame(){this.starts++;this.state='playing'}
};
const hostRtc={role:'host',connected:true,capacity:4,
  send(msg){return this.sendTo('guest',msg)},
  sendTo(id,msg){packets.push({id,msg});clients.get(id)?.onMessage(msg,'host');return true},
  broadcastToGuests(msg){
    for(const id of ids)this.sendTo(id,msg);
    return ids;
  }
};
const host=new Coop(hostGame,hostRtc);
hostGame.lanCoop=host;
host.awaitGuestShip();
for(const id of ids){
  const game={
    state:'menu',selectedShipId:'riftblade',
    hideAllModals(){},releaseJoystickTouch(){},players:{remove(){}},
    modalLevelup:{classList:{remove(){}}}
  };
  const rtc={role:'guest',connected:true,localPlayerId:id,capacity:4,
    send(msg){host.onMessage(msg,id);return true}};
  const client=new Coop(game,rtc);
  clients.set(id,client);
  client.enterGuestReady();
  assert.equal(client.remoteReady.capacity,4);
  assert.equal(client.localReady,false);
}
assert.equal(host.readyRoom.capacity,4);
assert.equal(host.readyRoom.canStart(),false);
host.setReady(true);
for(const id of ids){
  assert.equal(clients.get(id).setReady(true),true,id);
}
assert.equal(host.readyRoom.canStart(),true);
for(const id of ids){
  assert.equal(clients.get(id).remoteReady.canStart,true,id);
}
assert.equal(host.beginHostMatch(),true);
assert.equal(hostGame.starts,1);
for(const id of ids) {
  assert.equal(clients.get(id).game.state,'lan-client',id+' enters combat');
  assert.equal(host.allies.has(id),true);
}
assert.equal(packets.filter(p=>p.msg.type==='match_start').length,3);
assert.equal(host.beginHostMatch(),false);
console.log('Four client ready handshake passed: three distinct guest sessions, all-ready gate and shared match launch.');
