import { createHash, randomBytes } from 'node:crypto';

/** Vercel Hobby compatible, short-lived WebRTC SIGNALING ONLY.
 * No combat input or world snapshots are accepted/stored here.
 * Uses Upstash Redis REST, not process memory, sockets, or background jobs.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOM_TTL = 300;
const ROOM_PATTERN = /^[A-Z0-9]{6}$/;
const SIGNAL_MAX = 12000;
const ROOM_PREFIX = 'neon-lan:v1:';
const noCache = { 'Cache-Control': 'no-store, private, max-age=0' };
type Signal = {
  version: 1;
  kind: 'offer' | 'answer';
  room: string;
  description: { type: 'offer' | 'answer'; sdp: string };
};
type Room = { offer: Signal; hostToken: string };

function response(body: object, status = 200) {
  return Response.json(body, { status, headers: noCache });
}
function issueToken() { return randomBytes(24).toString('hex'); }
function isToken(v: unknown): v is string {
  return typeof v === 'string' && /^[a-f0-9]{48}$/.test(v);
}
function checkSignal(raw: unknown, kind: Signal['kind'], room: string): raw is Signal {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Partial<Signal>;
  return s.version === 1 && s.kind === kind && s.room === room &&
    s.description?.type === kind && typeof s.description.sdp === 'string' &&
    s.description.sdp.length > 0 && s.description.sdp.length <= SIGNAL_MAX &&
    /^(v=0|a=)/.test(s.description.sdp);
}
function redisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token || !/^https:\/\//.test(url)) return null;
  return { url: url.replace(/\/$/, ''), token };
}
async function redis(cmd: Array<string | number>, config: NonNullable<ReturnType<typeof redisCredentials>>) {
  const result = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cmd),
    cache: 'no-store',
    signal: AbortSignal.timeout(4500)
  });
  if (!result.ok) throw new Error('signaling_storage_unavailable');
  const data = await result.json() as { result?: unknown; error?: string };
  if (data.error) throw new Error('signaling_storage_unavailable');
  return data.result;
}
const roomKey = (room: string) => ROOM_PREFIX + room;
const guestKey = (room: string) => ROOM_PREFIX + room + ':guest';
const answerKey = (room: string) => ROOM_PREFIX + room + ':answer';

export async function POST(request: Request) {
  const config = redisCredentials();
  if (!config) return response({ error: 'signaling_unconfigured', message: '房间码功能需要配置免费 Upstash Redis；请使用高级手动配对。' }, 503);
  // The browser always calls this endpoint from the same deployment.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return response({ error: 'invalid_origin', message: '不允许跨站创建或访问房间' }, 403);
  }
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 26000) return response({ error: 'invalid_request' }, 413);
    body = JSON.parse(text);
    if (!body || typeof body !== 'object') return response({ error: 'invalid_request' }, 400);
  } catch {
    return response({ error: 'invalid_request', message: '请求格式不正确' }, 400);
  }
  const { action, room } = body;
  if (!ROOM_PATTERN.test(String(room || ''))) {
    return response({ error: 'invalid_room', message: '请输入6位房间码' }, 400);
  }
  const code = String(room);
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limiter = ROOM_PREFIX + 'limit:' + createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const count = Number(await redis(['INCR', limiter], config));
    if (count === 1) await redis(['EXPIRE', limiter, 60], config);
    if (count > 120) return response({ error: 'rate_limited', message: '操作太频繁，请稍后重试' }, 429);
    if (action === 'create') {
      if (!checkSignal(body.offer, 'offer', code)) return response({ error: 'invalid_offer' }, 400);
      const hostToken = issueToken();
      const stored: Room = { offer: body.offer, hostToken };
      const ok = await redis(['SET', roomKey(code), JSON.stringify(stored), 'EX', ROOM_TTL, 'NX'], config);
      if (ok !== 'OK') return response({ error: 'room_exists', message: '房间码重复，请重新创建' }, 409);
      return response({ room: code, hostToken, expiresIn: ROOM_TTL });
    }
    const rawRoom = await redis(['GET', roomKey(code)], config);
    if (typeof rawRoom !== 'string') {
      return response({ error: 'room_missing', message: '房间不存在或已过期，请让房主重新创建' }, 404);
    }
    const stored = JSON.parse(rawRoom) as Room;
    if (action === 'join') {
      const guestToken = issueToken();
      const ok = await redis(['SET', guestKey(code), guestToken, 'EX', ROOM_TTL, 'NX'], config);
      if (ok !== 'OK') return response({ error: 'room_full', message: '房间已有玩家正在加入，请创建新房间' }, 409);
      return response({ room: code, guestToken, offer: stored.offer });
    }
    if (action === 'answer') {
      if (!isToken(body.guestToken) || !checkSignal(body.answer, 'answer', code)) {
        return response({ error: 'invalid_answer' }, 400);
      }
      const current = await redis(['GET', guestKey(code)], config);
      if (current !== body.guestToken) return response({ error: 'guest_invalid', message: '房间连接已过期或被其他玩家占用' }, 403);
      const ok = await redis(['SET', answerKey(code), JSON.stringify(body.answer), 'EX', ROOM_TTL, 'NX'], config);
      if (ok !== 'OK') return response({ error: 'answered', message: '应答已提交，等待房主连接' }, 409);
      return response({ accepted: true });
    }
    if (action === 'poll') {
      if (!isToken(body.hostToken) || body.hostToken !== stored.hostToken) {
        return response({ error: 'host_invalid' }, 403);
      }
      const answer = await redis(['GET', answerKey(code)], config);
      return response({ answer: typeof answer === 'string' ? JSON.parse(answer) : null });
    }
    if (action === 'close') {
      if (!isToken(body.hostToken) || body.hostToken !== stored.hostToken) {
        return response({ error: 'host_invalid' }, 403);
      }
      await redis(['DEL', roomKey(code), guestKey(code), answerKey(code)], config);
      return response({ closed: true });
    }
    return response({ error: 'unknown_action' }, 400);
  } catch {
    return response({ error: 'signaling_unavailable', message: '临时信令服务不可用，可使用高级手动配对' }, 503);
  }
}
