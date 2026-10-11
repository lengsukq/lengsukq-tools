/* Run: node tests/neon-survivor-four-signaling.smoke.mjs */
import assert from 'node:assert/strict';
const store = new Map();
process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://mock-redis.invalid')) {
    const [command, key, value, ...extra] = JSON.parse(options.body);
    let result = null;
    if (command === 'INCR') {
      result = Number(store.get(key) || 0) + 1; store.set(key,result);
    } else if (command === 'EXPIRE') result = 1;
    else if (command === 'GET') result = store.has(key) ? store.get(key) : null;
    else if (command === 'SET') {
      if (extra.includes('NX') && store.has(key)) result = null;
      else {store.set(key,value);result='OK'}
    } else if (command === 'DEL') {
      const keys=[key,value,...extra].filter(Boolean);
      result=0;for(const k of keys){if(store.delete(k))result++}
    }
    return new Response(JSON.stringify({result}),{status:200});
  }
  return nativeFetch(url,options);
};
const {POST}=await import('../app/api/neon-lan/room/route.ts');
async function request(action, room, details={}) {
  const req = new Request('https://game.example/api/neon-lan/room', {
    method:'POST',
    headers:{origin:'https://game.example'},
    body:JSON.stringify({action,room,...details})
  });
  const response=await POST(req);
  return {status:response.status,...await response.json()};
}
const room='TEST24';
const ids=['guest','guest-2','guest-3'];
const offer=id=>({version:1,kind:'offer',room,playerId:id,
  description:{type:'offer',sdp:'v=0\na=seat:'+id}});
const answer=id=>({version:1,kind:'answer',room,playerId:id,
  description:{type:'answer',sdp:'v=0\na=seat:'+id}});
const offers=Object.fromEntries(ids.map(id=>[id,offer(id)]));
const created=await request('create',room,{capacity:4,offers});
assert.equal(created.status,200);
assert.equal(created.capacity,4);
const joined=await Promise.all(Array.from({length:4},()=>request('join',room)));
const successful=joined.filter(r=>r.status===200);
assert.equal(successful.length,3,'Three concurrent guests take distinct seats');
assert.equal(joined.filter(r=>r.status===409).length,1,'Fourth guest sees room_full');
assert.equal(new Set(successful.map(r=>r.playerId)).size,3);
for(const guest of successful) {
  assert.equal(guest.offer.playerId,guest.playerId);
  const accepted=await request('answer',room,{playerId:guest.playerId,
    guestToken:guest.guestToken,answer:answer(guest.playerId)});
  assert.equal(accepted.status,200);
}
const collected=await request('poll',room,{hostToken:created.hostToken});
assert.equal(collected.status,200);
assert.deepEqual(Object.keys(collected.answers).sort(),ids.sort());
assert.equal(collected.answers['guest-3'].playerId,'guest-3');
const attack=await request('answer',room,{playerId:'guest-2',
  guestToken:successful.find(x=>x.playerId==='guest').guestToken,
  answer:answer('guest-2')});
assert.equal(attack.status,403,'Guest cannot impersonate another slot');
const closed=await request('close',room,{hostToken:created.hostToken});
assert.equal(closed.status,200);
assert.equal((await request('join',room)).status,404);
console.log('Four-seat Upstash API passed: atomic joins, per-seat offers, separate answers and protected tokens.');
