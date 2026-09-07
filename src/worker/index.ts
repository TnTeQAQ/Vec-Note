/// <reference types="@cloudflare/workers-types" />
import {
  VECTOR_DIM,
  LIST_LIMIT,
  CONTENT_MAX_LENGTH,
  SIMILARITY_EPSILON,
  MIN_SHARED_SLOTS,
} from '../shared/constants';
import { makeSealKey, seal, countSharedSlots, type SealKey } from './seal';
import { ensureSeedNote } from './seed';
import {
  loginAdmin,
  logoutAdmin,
  changeAdminPassword,
  deleteNoteAsAdmin,
  setNotePinAsAdmin,
} from './admin';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  VEC_SEAL_SECRET: string;
}

let cachedKey: SealKey | null = null;
function sealKey(env: Env): SealKey {
  if (!env.VEC_SEAL_SECRET) throw new Error('VEC_SEAL_SECRET 未配置');
  if (!cachedKey) cachedKey = makeSealKey(env.VEC_SEAL_SECRET);
  return cachedKey;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function readVector(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length !== VECTOR_DIM) return null;
  const out = new Array<number>(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i++) {
    const n = Number(v[i]);
    if (!Number.isFinite(n)) return null;
    out[i] = n;
  }
  return out;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// 同一 IP 每分钟最多发送一条留言
const RATE_LIMIT_MS = 60_000;

function clientIp(request: Request): string {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf) return cf;
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

async function checkRateLimit(env: Env, ip: string): Promise<boolean> {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT last_post_at FROM rate_limits WHERE ip = ?')
    .bind(ip)
    .first<{ last_post_at: number }>();
  if (row && now - row.last_post_at < RATE_LIMIT_MS) return false;
  await env.DB.prepare(
    'INSERT INTO rate_limits (ip, last_post_at) VALUES (?, ?) ON CONFLICT(ip) DO UPDATE SET last_post_at = excluded.last_post_at',
  )
    .bind(ip, now)
    .run();
  return true;
}

async function createNote(request: Request, env: Env): Promise<Response> {
  if (!(await checkRateLimit(env, clientIp(request)))) {
    return json({ error: '发送太频繁，请稍后再试', rateLimited: true }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return json({ error: 'content is required' }, 400);
  if (content.length > CONTENT_MAX_LENGTH)
    return json({ error: `content too long (max ${CONTENT_MAX_LENGTH})` }, 400);

  const titleCt = typeof body.title_ct === 'string' ? body.title_ct.trim() : '';
  if (!titleCt) return json({ error: 'title_ct is required' }, 400);

  const vec = readVector(body.ngram_vector);
  if (!vec) return json({ error: `ngram_vector must be an array of ${VECTOR_DIM} numbers` }, 400);

  const saved = seal(vec, sealKey(env));
  const id = crypto.randomUUID();
  const created_at = Date.now();

  await env.DB.prepare(
    'INSERT INTO notes (id, created_at, content, sealed_vector, title_ct) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, created_at, content, JSON.stringify(saved), titleCt)
    .run();

  return json({ id, created_at, ciphertext: titleCt, content }, 201);
}

async function listNotes(_request: Request, env: Env, url: URL): Promise<Response> {
  const rawLimit = url.searchParams.get('limit');
  let limit = Number.parseInt(rawLimit ?? '20', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = LIST_LIMIT;
  limit = Math.min(limit, 100);

  const rawOffset = url.searchParams.get('offset');
  let offset = Number.parseInt(rawOffset ?? '0', 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  // 多取一行判断是否还有下一页（hasMore）
  // 排序：置顶优先（pinned_at DESC，SQLite 下 NULL 排最后），同组内按创建时间倒序
  const { results } = await env.DB.prepare(
    'SELECT id, created_at, content, title_ct, pinned_at FROM notes ORDER BY pinned_at DESC, created_at DESC LIMIT ? OFFSET ?',
  )
    .bind(limit + 1, offset)
    .all<{
      id: string;
      created_at: number;
      content: string;
      title_ct: string;
      pinned_at: number | null;
    }>();

  const rows = results ?? [];
  const hasMore = rows.length > limit;
  const notes = rows.slice(0, limit).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    ciphertext: r.title_ct,
    content: r.content,
    pinned: r.pinned_at !== null,
    pinned_at: r.pinned_at,
  }));
  return json({ notes, hasMore });
}

async function search(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const vec = readVector(body.ngram_vector);
  if (!vec) return json({ error: `ngram_vector must be an array of ${VECTOR_DIM} numbers` }, 400);

  const q = seal(vec, sealKey(env));
  const qNorm = Math.sqrt(dot(q, q));
  if (qNorm === 0) return json({ results: [], total: 0, hasMore: false });

  const { results } = await env.DB.prepare(
    'SELECT id, created_at, content, title_ct, sealed_vector, pinned_at FROM notes',
  ).all<{
    id: string;
    created_at: number;
    content: string;
    title_ct: string;
    sealed_vector: string;
    pinned_at: number | null;
  }>();

  // 请求内分页参数（默认每页 20）
  const rawLimit = typeof body.limit === 'number' ? body.limit : 20;
  let limit = Math.floor(rawLimit);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  limit = Math.min(limit, 100);
  const rawOffset = typeof body.offset === 'number' ? body.offset : 0;
  let offset = Math.floor(rawOffset);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  const ranked: Array<{
    id: string;
    created_at: number;
    ciphertext: string;
    content: string;
    score: number;
    pinned: boolean;
    pinned_at: number | null;
  }> = [];
  for (const r of results ?? []) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(r.sealed_vector);
    } catch {
      continue;
    }
    const sv = readVector(parsed);
    if (!sv) continue;
    const vn = Math.sqrt(dot(sv, sv));
    if (vn === 0) continue;
    const score = dot(q, sv) / (qNorm * vn);
    // 必须同时满足：余弦高于阈值，且与查询至少共享一个显著 n-gram 哈希槽位。
    if (score > SIMILARITY_EPSILON && countSharedSlots(q, sv) >= MIN_SHARED_SLOTS) {
      ranked.push({
        id: r.id,
        created_at: r.created_at,
        ciphertext: r.title_ct,
        content: r.content,
        score,
        pinned: r.pinned_at !== null,
        pinned_at: r.pinned_at,
      });
    }
  }

  // 排序：置顶优先，组内按相似度倒序
  ranked.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score);
  // 总命中数 = 高于阈值且排序后的全部结果；接口按 offset/limit 分页返回。
  const total = ranked.length;
  const page = ranked
    .slice(offset, offset + limit)
    .map(({ id, created_at, ciphertext, content, score, pinned, pinned_at }) => ({
      id,
      created_at,
      ciphertext,
      content,
      pinned,
      pinned_at,
      // 余弦相似度（0..1）：密封是正交变换、精确保持余弦，前端展示为百分比。
      // 返回的是分数而非向量本身，sealed_vector 仍然不出服务端。
      similarity: Number(Math.min(Math.max(score, 0), 1).toFixed(4)),
    }));
  return json({ results: page, total, hasMore: offset + page.length < total });
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const p = url.pathname;

  // 隐藏管理入口
  if (p === '/api/admin/login' && request.method === 'POST') return loginAdmin(request, env);
  if (p === '/api/admin/logout' && request.method === 'POST') return logoutAdmin(request, env);
  if (p === '/api/admin/password' && request.method === 'POST') {
    return changeAdminPassword(request, env);
  }

  if (p === '/api/notes' && request.method === 'POST') return createNote(request, env);
  if (p === '/api/notes' && request.method === 'GET') {
    // 站点初始化：全新数据库第一次被访问时种入 README 示例留言
    await ensureSeedNote(env, sealKey(env));
    return listNotes(request, env, url);
  }
  if (p === '/api/search' && request.method === 'POST') {
    await ensureSeedNote(env, sealKey(env));
    return search(request, env);
  }

  // 留言详情操作（仅管理员删除/置顶）
  const notePinMatch = /^\/api\/notes\/([^/]+)\/pin$/.exec(p);
  if (notePinMatch && request.method === 'PATCH') {
    return setNotePinAsAdmin(request, env, notePinMatch[1]);
  }
  const noteMatch = /^\/api\/notes\/([^/]+)$/.exec(p);
  if (noteMatch && request.method === 'DELETE') {
    return deleteNoteAsAdmin(request, env, noteMatch[1]);
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    void ctx;
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        // 未预期异常：记录日志并返回统一 JSON 500（避免 CF 裸 1101 文本）
        console.error('API error:', err);
        return json({ error: '服务器内部错误' }, 500);
      }
    }

    // 静态资源（含前端构建产物）；未知路径在 GET 时回退到 index.html（SPA）。
    const asset = await env.ASSETS.fetch(request);
    if (asset.status === 404 && request.method === 'GET') {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
    }
    return asset;
  },
};