export interface Note {
  id: string;
  created_at: number;
  ciphertext: string;
  content: string;
}

export interface SearchResult extends Note {
  /** 余弦相似度（0..1）；仅 /api/search 返回，UI 展示为百分比 */
  similarity?: number;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
    (err as Error & { status?: number; rateLimited?: boolean }).status = res.status;
    (err as Error & { rateLimited?: boolean }).rateLimited = data.rateLimited === true;
    throw err;
  }
  return data as T;
}

/** 提交留言：只上传 内容 + 公开向量 + 密文，标题明文不出浏览器。 */
export function createNote(content: string, ngram_vector: number[], title_ct: string): Promise<Note> {
  return post<Note>('/api/notes', { content, ngram_vector, title_ct });
}

/** 最近留言（分页）：limit 每页条数、offset 偏移；hasMore 表示是否还有下一页。 */
export async function listNotes(
  limit = 10,
  offset = 0,
): Promise<{ notes: Note[]; hasMore: boolean }> {
  const res = await fetch(`/api/notes?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { notes: Note[]; hasMore?: boolean };
  return { notes: data.notes, hasMore: data.hasMore ?? false };
}

/** 搜索（分页）：total 为总命中数，results 为当前页，hasMore 是否还有下一页。 */
export function searchNotes(
  ngram_vector: number[],
  offset = 0,
  limit = 10,
): Promise<{ results: SearchResult[]; total: number; hasMore: boolean }> {
  return post<{ results: SearchResult[]; total: number; hasMore: boolean }>('/api/search', {
    ngram_vector,
    offset,
    limit,
  });
}

// ---- 隐藏管理入口 ----

export interface AdminSession {
  token: string;
  expires_at: number;
}

/** 密码登录（默认密码 admin），成功返回会话 token。 */
export function adminLogin(password: string): Promise<AdminSession> {
  return post<AdminSession>('/api/admin/login', { password });
}

/** 退出管理（使当前 token 失效）。 */
export function adminLogout(token: string): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/api/admin/logout', {}, token);
}

/** 修改管理密码：需当前密码 + 新密码，使用登录后的 token 鉴权。 */
export function adminChangePassword(
  token: string,
  current_password: string,
  new_password: string,
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/api/admin/password', { current_password, new_password }, token);
}

/** 管理员删除一条留言。 */
export async function adminDeleteNote(token: string, id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as { ok: boolean };
}