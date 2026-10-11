/* Run: node tests/neon-survivor-four-peer-rtc.smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
class FakePeer {
  constructor(){this.iceGatheringState='complete';this.connectionState='new';}
  createDataChannel(name) {
    return {label:name,readyState:'open',bufferedAmount:0,sent:[],
      send(payload){this.sent.push(payload)},close(){this.readyState='closed'}};
  }
  createOffer(){return Promise.resolve({type:'offer',sdp:'v=0\na=offer'})}
  createAnswer(){return Promise.resolve({type:'answer',sdp:'v=0\na=answer'})}
  setLocalDescription(value){this.localDescription=value;return Promise.resolve()}
  setRemoteDescription(value){this.remoteDescription=value;return Promise.resolve()}
  close(){this.connectionState='closed'}
}
let random=0;
const window={NeonPlayers:{validId:id=>['host','guest','guest-2','guest-3'].includes(id)}};
const context={window,RTCPeerConnection:FakePeer,
  crypto:{getRandomValues(data){for(let i=0;i<data.length;i++)data[i]=++random%255;return data}},
  BroadcastChannel:undefined,console,setTimeout,clearTimeout};
vm.createContext(context);
const root='public/Game/neon-survivor/js/network/';
for (const file of ['peers','rtc']) {
  vm.runInContext(fs.readFileSync(root+file+'.js','utf8'),context);
}
const {LanRTC}=window.NeonLanRTC;
(async()=>{
  for(const capacity of [2,3,4]){
    const host=new LanRTC();
    const code=host.host(capacity);
    const ids=['guest','guest-2','guest-3'].slice(0,capacity-1);
    const guests=[];
    for(const id of ids){
      const offer=await host.makeOffer(id);
      const guest=new LanRTC();
      await host.acceptAnswer(await guest.acceptOffer(offer),id);
      assert.equal(guest.localPlayerId,id);
      guests.push(guest);
    }
    assert.equal(host.peerLinks.size,capacity-1);
    assert.equal(host.peers.size,capacity-1);
    assert.equal(new Set([...host.peerLinks.values()].map(p=>p.pc)).size,capacity-1);
    assert.equal(host.room,code);
    const receipts={};
    for(const id of ids){
      const link=host.peers.get(id);
      receipts[id]=link.control;
      assert.equal(host.sendTo(id,{type:'ready_roster',seat:id}),true);
    }
    for(const id of ids){
      assert.equal(receipts[id].sent.length,1,'Each guest receives only their own message');
      assert.equal(JSON.parse(receipts[id].sent[0]).seat,id);
    }
    assert.equal(host.sendTo('guest-4',{type:'input'}),false);
    assert.equal(host.broadcastToGuests({type:'match_start'}).length,ids.length);
    assert.equal(host.peers.get('guest').control.sent.length,2);
    const first=host.peers.get('guest').control;
    first.bufferedAmount=150000;
    host.peers.get('guest').realtime.bufferedAmount=150000;
    assert.equal(host.sendTo('guest',{type:'snapshot'}),false);
    if (ids.length > 1) {
      assert.equal(host.sendTo(ids.at(-1),{type:'ping'}),true,
        'Congested channel must not block other pilots');
    }
    for(const guest of guests)guest.close();
    host.close();
    assert.equal(host.peerLinks.size,0);
  }
  console.log('Four-peer WebRTC passed: separate SDP, peer identities, 2/3/4 capacities and independent backpressure.');
})().catch(e=>{console.error(e);process.exitCode=1});
