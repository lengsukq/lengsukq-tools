/* Run: node tests/neon-survivor-multiplayer-contract.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/';
const html = fs.readFileSync(root+'index.html','utf8');
for (const part of ['js/players.js','js/network/roster.js',
  'js/network/peers.js','js/network/snapshots.js']) assert.ok(html.includes(part));
const sandbox = { window: {}, console, setTimeout, clearTimeout,
  crypto: { getRandomValues(bytes) { bytes.fill(1); return bytes; } },
  performance: { now:()=>1000 } };
vm.createContext(sandbox);
for (const file of ['ships','ships.generated','players','network/roster','network/peers','network/snapshots','network/rtc','network/coop'])
  vm.runInContext(fs.readFileSync(root+'js/'+file+'.js','utf8'), sandbox);
const {PlayerRegistry,createRemotePilot}=sandbox.window.NeonPlayers;
const {RoomRoster}=sandbox.window.NeonLanRoster;
const {PeerDirectory}=sandbox.window.NeonLanPeers;
const projection=sandbox.window.NeonLanSnapshots;
const game={player:{id:'host',shipId:'riftblade',hp:100,maxHp:100,x:0,y:0,level:1,
  xpNeeded:100,weapons:{blaster:1},passives:{}}, players:new PlayerRegistry(),
  enemies:[],gems:[],bullets:[],enemyBullets:[],texts:[],particles:[],
  mines:[],orbiters:[],laserBeams:[],dashTrails:[],shockwaves:[],
  blackHoles:[],lightningTethers:[],companionDrones:[],survivalTime:0, kills:0,
  state:'playing',difficulty:0};
game.players.register('host',game.player);
const roster=new RoomRoster(4);
for(const id of ['guest','guest-2','guest-3']) {
  assert.equal(roster.reserve(id), id);
  roster.setStatus(id,'connected');
  game.players.register(id,createRemotePilot(game,id));
}
assert.equal(game.players.size,4);
const all=projection.players(game);
assert.equal(all.length,4);
assert.deepEqual(Array.from(all,p=>p.id),['host','guest','guest-2','guest-3']);
const framed=projection.decorate({type:'snapshot',seq:99,host:{hp:100},guest:{hp:100}},game,'guest-3');
assert.equal(framed.protocolVersion,2);
assert.equal(framed.localPlayerId,'guest-3');
assert.equal(framed.players.length,4);
assert.equal(framed.host.hp,100,'The legacy snapshot remains intact');
assert.equal('weapons' in framed.players[0],false);
assert.equal('input' in framed.players[1],false);
assert.equal(Object.isFrozen(framed.players[0]),true);
assert.throws(()=>projection.decorate({},game,'inject<script>'),/Invalid multiplayer snapshot/);
assert.equal(projection.decorate({type:'snapshot'},game,'other').localPlayerId,undefined,
  'Unknown recipient IDs never become valid local player identities');
const serialized=projection.serializePilot('guest',{shipId:'riftblade',hp:Infinity,x:NaN,y:1e50});
assert.equal(serialized.hp,0);
assert.equal(serialized.x,0);
assert.equal(serialized.y,10000000);

const directory=new PeerDirectory();
const messages=new Map();
function channel(label,id){
  const item={label,readyState:'open',bufferedAmount:0,
    send(data){ const list=messages.get(id)||[];list.push(JSON.parse(data));messages.set(id,list); }};
  return item;
}
for (const id of ['guest','guest-2','guest-3']) {
  directory.attach(id,channel('neon-game',id));
  directory.attach(id,channel('neon-realtime',id));
}
assert.equal(directory.size,3);
const recipients=directory.broadcast(id=>({type:'snapshot',localPlayerId:id,players:all}));
assert.deepEqual(Array.from(recipients),['guest','guest-2','guest-3']);
for(const id of recipients){
  const packets=messages.get(id);
  assert.equal(packets.length,1);
  assert.equal(packets[0].localPlayerId,id);
}
const replies=[];
assert.equal(directory.receive('guest-2',JSON.stringify({type:'input',playerId:'host',seq:8}),
  (payload,sender)=>replies.push({payload,sender})),true);
assert.equal(replies[0].sender,'guest-2',
  'The connection ID overrides spoofed sender fields');
assert.equal(directory.receive('unknown','{}',()=>{}),false);
assert.equal(directory.receive('guest',JSON.stringify([]),()=>{}),false);
assert.equal(directory.receive('guest', '{not-json',()=>{}),false);
assert.equal(directory.sendTo('guest',{type:'input',msg:'x'.repeat(45000)}),false);
directory.get('guest').realtime.bufferedAmount=100001;
assert.equal(directory.sendTo('guest',{type:'snapshot',seq:4}),false,
  'Per-peer backpressure should drop stale snapshots');
assert.deepEqual(Array.from(directory.broadcast({type:'profile',name:'team'},'guest')),['guest-2','guest-3']);
const rtc = new sandbox.window.NeonLanRTC.LanRTC();
rtc.role = 'host';
rtc.peers = directory;
assert.equal(rtc.sendTo('guest-2',{type:'snapshot',seq:5}), true);
assert.equal(rtc.send({type:'profile',name:'legacy-guest'}), true,
  'Original two-person send continues addressing guest');
directory.get('guest').realtime.bufferedAmount = 0;
assert.deepEqual(Array.from(rtc.broadcastToGuests(id=>({type:'snapshot',localPlayerId:id}))),
  ['guest','guest-2','guest-3']);
rtc.role = 'guest';
assert.deepEqual(Array.from(rtc.broadcastToGuests({type:'snapshot'})), [],
  'Only the host may broadcast authoritative world state');
assert.equal(directory.remove('guest-3'),true);
assert.equal(directory.size,2);
directory.clear();
assert.equal(directory.size,0);

const legacyFrame=sandbox.window.NeonLanCoop.snapshot(game,game.players.get('guest'),11,null,'guest-2');
assert.equal(legacyFrame.protocolVersion,2);
assert.equal(legacyFrame.localPlayerId,'guest-2');
assert.equal(legacyFrame.players.length,4);
assert.ok(legacyFrame.host && legacyFrame.guest);
console.log('Multiplayer contract passed: 2–4 player state, owner-bound three-peer delivery, v2 players snapshots and legacy compatibility.');
