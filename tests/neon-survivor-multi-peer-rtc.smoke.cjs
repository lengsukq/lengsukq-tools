/* Run: node tests/neon-survivor-multi-peer-rtc.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const messages = [];
let ticket = 0;
class FakeRTCPeerConnection {
  constructor() {this.iceGatheringState='complete';this.connectionState='new';this.channels=[];}
  createDataChannel(label) {
    const channel = {label,readyState:'open',bufferedAmount:0,sent:[],
      send(data) {this.sent.push(JSON.parse(data))},
      close(){this.readyState='closed'}};
    this.channels.push(channel);
    return channel;
  }
  createOffer() {return Promise.resolve({type:'offer',sdp:'a=fake:offer'})}
  createAnswer(){return Promise.resolve({type:'answer',sdp:'a=fake:answer'})}
  setLocalDescription(d){this.localDescription=d;return Promise.resolve()}
  setRemoteDescription(d){this.remoteDescription=d;return Promise.resolve()}
  close(){this.closed=true;this.connectionState='closed'}
}
const ctx={
  window:{NeonPlayers:{validId(id){return /^(host|guest|guest-2|guest-3)$/.test(id)}}},
  RTCPeerConnection:FakeRTCPeerConnection,
  crypto:{getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=(ticket++%200)+1;return bytes}},
  performance:{now:()=>1000},console,setTimeout,clearTimeout
};
vm.createContext(ctx);
for(const name of ['peers','rtc'])
  vm.runInContext(fs.readFileSync('public/Game/neon-survivor/js/network/'+name+'.js','utf8'),ctx);
const {LanRTC}=ctx.window.NeonLanRTC;
(async()=>{
  const host=new LanRTC(()=>{},(message,id)=>messages.push({message,id}));
  const room=host.host(4);
  assert.equal(host.capacity,4);
  const clients=[];
  for(const id of ['guest','guest-2','guest-3']) {
    const guest=new LanRTC();
    const offer=await host.makeOffer(id);
    const answer=await guest.acceptOffer(offer);
    assert.equal(guest.localPlayerId,id);
    assert.equal(guest.capacity,4);
    await host.acceptAnswer(answer,id);
    assert.equal(host.peerLinks.get(id)?.pc?.remoteDescription?.type,'answer');
    assert.equal(guest.peer.remoteDescription.type,'offer');
    clients.push(guest);
  }
  assert.equal(host.peerLinks.size,3,'Separate peer connections are retained');
  assert.equal(host.peers.size,3);
  for(const [id, link] of host.peerLinks) {
    link.control.onopen();
    assert.equal(host.sendTo(id,{type:'snapshot',seq:1}),true);
    assert.equal(link.realtime.sent.length,1,'Realtime snapshots use the low-latency channel');
    assert.equal(link.control.sent.length,0);
    // The sender cannot impersonate another guest using a JSON field.
    link.control.onmessage({data:JSON.stringify({type:'ready_update',playerId:'host',seq:1})});
    assert.equal(messages.at(-1).id,id);
  }
  host.peerLinks.get('guest-2').realtime.bufferedAmount=110000;
  assert.equal(host.sendTo('guest-2',{type:'snapshot',seq:2}),false,
    'Backpressure stops stale per-guest snapshots');
  assert.equal(host.sendTo('guest-2',{type:'ready_roster',revision:1}),true,
    'Reliable room control remains available during realtime congestion');
  assert.equal(host.sendTo('guest-9',{type:'ready_roster'}),false);
  host.close();
  for(const c of clients)c.close();
  assert.equal(host.peerLinks.size,0,'Closing room releases all three connections');
  console.log('WebRTC host-star passed: three isolated guest peers, sender binding, realtime backpressure and teardown.');
})().catch(error=>{console.error(error);process.exitCode=1});
