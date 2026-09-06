/// <reference types="@cloudflare/workers-types" />

import { hashPassword, verifyPassword } from './password';

// 隐藏管理入口的服务端逻辑：默认密码 admin（首次使用时惰性入库）、
// PBKDF2 哈希校验、Bearer 会话、登录失败锁定、删除留言。

const DEFAULT_ADMIN_PASSWORD = 'admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 会话 7 天
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000; // 连续失败 5 次锁 10 分钟
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 128;

interface EnvWithDb {
  DB: D1Database;
}

/** 确保 admin_config 存在唯一一行；不存在则写入默认密码 admin 的哈希。 */
async function ensureAdminRow(env: EnvWithDb): Promise<{ password_hash: string }> {
  const existing = await env.DB.prepare('SELECT password_hash FROM admin_config WHERE id = 1').first<{
    password_hash: string;
  }>();
  if (existing) return existing;
  const password_hash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  await env.DB.prepare(
    'INSERT OR IGNORE INTO admin_config (id, password_hash, updated_at) VALUES (1, ?, ?)',
  )
    .bind(password_hash, Date.now())
    .run();
  const row = await env.DB.prepare('SELECT password_hash FROM admin_config WHERE id = 1').first<{
    password_hash: string;
  }>();
  if (!row) throw new Error('admin_config init failed');
  return row;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/** 校验 Bearer 会话是否有效；通过返回 true。 */
async function hasValidSession(env: EnvWithDb, token: string | null): Promise<boolean> {
  if (!token) return false;
  const row = await env.DB.prepare(
    'SELECT expires_at FROM admin_sessions WHERE token = ?',
  )
    .bind(token)
    .first<{ expires_at: number }>();
  return !!row && row.expires_at > Date.now();
}

export async function loginAdmin(request: Request, env: EnvWithDb): Promise<Response> {
  const ip = clientIpOf(request);
  const now = Date.now();

  // 失败锁定检查
  const attempt = await env.DB.prepare(
    'SELECT failed, locked_until FROM admin_login_attempts WHERE ip = ?',
  )
    .bind(ip)
    .first<{ failed: number; locked_until: number }>();
  if (attempt && attempt.locked_until > now) {
    return json(
      { error: '失败次数过多，请稍后再试', locked: true, retryAfterMs: attempt.locked_until - now },
      429,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) return json({ error: 'password is required' }, 400);

  const { password_hash } = await ensureAdminRow(env);
  const ok = await verifyPassword(password, password_hash);
  if (!ok) {
    const failed = (attempt?.failed ?? 0) + 1;
    const locked_until = failed >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCK_MS : 0;
    await env.DB.prepare(
      `INSERT INTO admin_login_attempts (ip, failed, locked_until) VALUES (?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET failed = excluded.failed, locked_until = excluded.locked_until`,
    )
      .bind(ip, failed, locked_until)
      .run();
    return json(
      { error: locked_until ? '失败次数过多，请稍后再试' : '密码错误', locked: !!locked_until },
      locked_until ? 429 : 401,
    );
  }

  // 成功后清除失败记录并建立会话
  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').bind(ip).run();
  // 顺手清理过期会话，防止表无限增长
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now).run();
  const token = crypto.randomUUID();
  const expires_at = now + SESSION_TTL_MS;
  await env.DB.prepare(
    'INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, now, expires_at)
    .run();

  return json({ ok: true, token, expires_at });
}

export async function logoutAdmin(request: Request, env: EnvWithDb): Promise<Response> {
  const token = bearerToken(request);
  if (token) {
    await env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run();
  }
  return json({ ok: true });
}

export async function changeAdminPassword(
  request: Request,
  env: EnvWithDb,
): Promise<Response> {
  const token = bearerToken(request);
  if (!(await hasValidSession(env, token))) {
    return json({ error: '未登录或会话已过期', code: 'unauthorized' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const current = typeof body.current_password === 'string' ? body.current_password : '';
  const next = typeof body.new_password === 'string' ? body.new_password : '';
  if (!current || !next) return json({ error: '请填写当前密码与新密码' }, 400);
  if (next.length < MIN_PASSWORD_LENGTH || next.length > MAX_PASSWORD_LENGTH) {
    return json({ error: `新密码长度需为 ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} 位` }, 400);
  }

  const { password_hash } = await ensureAdminRow(env);
  const ok = await verifyPassword(current, password_hash);
  if (!ok) return json({ error: '当前密码错误' }, 400);

  const next_hash = await hashPassword(next);
  await env.DB.prepare('UPDATE admin_config SET password_hash = ?, updated_at = ? WHERE id = 1')
    .bind(next_hash, Date.now())
    .run();
  // 改密后撤销其他会话（保留当前 token，避免把刚操作的自己登出）
  await env.DB.prepare('DELETE FROM admin_sessions WHERE token != ?').bind(token).run();

  return json({ ok: true });
}

/** 删除一条留言（需管理员会话）。 */
export async function deleteNoteAsAdmin(
  request: Request,
  env: EnvWithDb,
  noteId: string,
): Promise<Response> {
  const token = bearerToken(request);
  if (!(await hasValidSession(env, token))) {
    return json({ error: '未登录或会话已过期', code: 'unauthorized' }, 401);
  }
  const res = await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run();
  if (res.meta.changes === 0) return json({ error: '留言不存在或已被删除' }, 404);
  return json({ ok: true });
}

function clientIpOf(request: Request): string {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf) return cf;
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
