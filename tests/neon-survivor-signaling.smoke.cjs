/* Run: node tests/neon-survivor-signaling.smoke.cjs
 * No real Upstash/Vercel credentials or network access required.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { randomBytes, webcrypto } = require('node:crypto');

const path = 'public/Game/neon-survivor/';
const html = fs.readFileSync(path + 'index.html', 'utf8');
const rtcSource = fs.readFileSync(path + 'js/network/rtc.js', 'utf8');
const signalSource = fs.readFileSync(path + 'js/network/signaling.js', 'utf8');
const lobbySource = fs.readFileSync(path + 'js/network/ui.js', 'utf8');
const apiSource = fs.readFileSync('app/api/neon-lan/room/route.ts', 'utf8');
assert.ok(html.includes('js/network/signaling.js'));
assert.ok(html.indexOf('js/network/signaling.js') < html.indexOf('js/network/ui.js'));
assert.match(rtcSource, /iceServers: \[\]/, 'Never enable cloud TURN/STUN');
assert.doesNotMatch(apiSource, /inputCommand|enemyBullets|worldSnapshot/);
assert.match(lobbySource, /输入房间码加入/);
assert.match(lobbySource, /高级连接 \/ 手动配对/);
assert.match(lobbySource, /复制邀请链接/);

// Minimal in-memory stand-in for Upstash REST commands; no process memory is
// used by the real API, this fake is deliberately limited to the test.
const redis = new Map();
const calls = [];
const redisURL = 'https://fake-upstash.invalid';
const originalFetch = global.fetch;
const originalEnv = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.UPSTASH_REDIS_REST_URL = redisURL;
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only-secret';
global.fetch = async (url, options) => {
  assert.equal(url, redisURL);
  assert.equal(options.headers.Authorization, 'Bearer test-only-secret');
  const [command, ...args] = JSON.parse(options.body);
  calls.push(command);
  let result = null;
  const key = args[0];
  if (command === 'GET') result = redis.get(key) ?? null;
  else if (command === 'SET') {
    if (args.includes('NX') && redis.has(key)) result = null;
    else { redis.set(key, args[1]); result = 'OK'; }
  } else if (command === 'INCR') {
    result = Number(redis.get(key) || 0) + 1;
    redis.set(key, String(result));
  } else if (command === 'EXPIRE') result = 1;
  else if (command === 'DEL') {
    result = 0;
    for (const name of args) if (redis.delete(name)) result++;
  } else throw Error('Unexpected redis command: ' + command);
  return { ok: true, json: async () => ({ result }) };
};

async function main() {
  const { POST } = await import(pathToFileURL(resolve('app/api/neon-lan/room/route.ts')).href);
  const body = (action, room, extra = {}) => ({ action, room, ...extra });
  async function request(json, ip = '10.0.0.1') {
    const res = await POST(new Request('https://game.example/api/neon-lan/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://game.example',
        'x-forwarded-for': ip },
      body: JSON.stringify(json)
    }));
    return { status: res.status, data: await res.json(), headers: res.headers };
  }
  const room = 'AX7K92';
  const offer = { version: 1, room, kind: 'offer',
    description: { type: 'offer', sdp: 'v=0\r\na=ice-ufrag:host' } };
  const answer = { version: 1, room, kind: 'answer',
    description: { type: 'answer', sdp: 'v=0\r\na=ice-ufrag:guest' } };
  let result = await request(body('create', room, { offer }));
  assert.equal(result.status, 200);
  assert.equal(result.data.expiresIn, 300);
  assert.ok(/^[a-f0-9]{48}$/.test(result.data.hostToken));
  const hostToken = result.data.hostToken;
  assert.equal(result.headers.get('cache-control'), 'no-store, private, max-age=0');
  assert.equal((await request(body('create', room, { offer }))).status, 409);
  result = await request(body('join', room));
  assert.equal(result.status, 200);
  assert.equal(result.data.offer.description.sdp, offer.description.sdp);
  const guestToken = result.data.guestToken;
  assert.equal((await request(body('join', room))).status, 409, 'A second guest must not steal a reserved room');
  assert.equal((await request(body('answer', room, { answer, guestToken: 'bad' }))).status, 400);
  assert.equal((await request(body('answer', room, { answer, guestToken: '0'.repeat(48) }))).status, 403);
  assert.equal((await request(body('poll', room, { hostToken: '0'.repeat(48) }))).status, 403);
  assert.deepEqual((await request(body('poll', room, { hostToken }))).data, { answer: null });
  assert.equal((await request(body('answer', room, { answer, guestToken }))).status, 200);
  assert.equal((await request(body('answer', room, { answer, guestToken }))).status, 409);
  result = await request(body('poll', room, { hostToken }));
  assert.equal(result.data.answer.description.sdp, answer.description.sdp);
  assert.equal((await request(body('close', room, { hostToken: 'f'.repeat(48) }))).status, 403);
  assert.equal((await request(body('close', room, { hostToken }))).status, 200);
  assert.equal((await request(body('join', room))).status, 404);
  assert.equal((await request(body('join', 'BAD'))).status, 400);
  assert.equal((await request(body('create', room, { offer: { ...offer, description: { type: 'offer', sdp: 'bad' } } }))).status, 400);
  assert.equal((await request(body('create', room, { offer }), '10.0.0.2')).status, 200);
  assert.ok(calls.includes('SET') && calls.includes('GET') && calls.includes('DEL'));

  const clientContext = {
    // The tablet regression: AbortSignal.timeout() is absent.
    // The client should only require widely supported AbortController.
    window: {}, console, crypto: webcrypto, AbortController,
    setTimeout, clearTimeout, URL,
    fetch: async (url, options) => {
      assert.equal(url, '/api/neon-lan/room');
      const { status, data } = await request(JSON.parse(options.body), '10.0.0.3');
      return { ok: status < 400, status, json: async () => data };
    }
  };
  vm.createContext(clientContext);
  vm.runInContext(signalSource, clientContext);
  const { RoomSignaling } = clientContext.window.NeonLanSignaling;
  const statuses = [];
  const host = new RoomSignaling(message => statuses.push(message));
  const guest = new RoomSignaling(message => statuses.push(message));
  let accepted = null;
  const hostRTC = {
    room: null, connected: false,
    host() { this.room = 'BC3T92'; },
    makeOffer() {
      return Promise.resolve(JSON.stringify({ ...offer, room: this.room }));
    },
    acceptAnswer(value) { accepted = JSON.parse(value); return Promise.resolve(); }
  };
  const guestRTC = {
    room: null,
    acceptOffer(value) {
      this.room = JSON.parse(value).room;
      return Promise.resolve(JSON.stringify({ ...answer, room: this.room }));
    }
  };
  assert.equal(await host.create(hostRTC), 'BC3T92');
  assert.equal(await guest.join(guestRTC, 'bc3t92'), 'BC3T92');
  await new Promise(resolve => setTimeout(resolve, 1400));
  assert.equal(accepted.description.sdp, answer.description.sdp);
  assert.ok(statuses.some(s => s.includes('局域网直连')));
  await host.close();
  await guest.close();

  // Verify timeout cancellation and a readable message on a browser without
  // AbortSignal.timeout, without waiting 8 real seconds in this smoke test.
  let fireTimeout;
  let cleared = 0;
  const oldBrowser = {
    window: {}, console, AbortController,
    setTimeout(callback, delay) {
      assert.equal(delay, 8000);
      fireTimeout = callback;
      return 17;
    },
    clearTimeout(id) { assert.equal(id, 17); cleared++; },
    fetch(_url, options) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
  };
  vm.createContext(oldBrowser);
  vm.runInContext(signalSource, oldBrowser);
  const oldClient = new oldBrowser.window.NeonLanSignaling.RoomSignaling();
  const timeoutRequest = oldClient.request('join', { room });
  fireTimeout();
  await assert.rejects(timeoutRequest, /连接房间服务超时/);
  assert.equal(cleared, 1);

  delete process.env.UPSTASH_REDIS_REST_URL;
  const unavailable = await request(body('join', room));
  assert.equal(unavailable.status, 503, 'Missing free Upstash env must fail clearly');
  assert.equal(unavailable.data.error, 'signaling_unconfigured');
  console.log('Neon Survivor Vercel Hobby signaling passed: room codes, auth, expiry-safe storage, 2-player limit, automatic SDP, fallback.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
  global.fetch = originalFetch;
  if (originalEnv === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalEnv;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
});
