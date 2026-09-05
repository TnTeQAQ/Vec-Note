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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
  return data as T;
}

/** 提交留言：只上传 内容 + 公开向量 + 密文，标题明文不出浏览器。 */
export function createNote(content: string, ngram_vector: number[], title_ct: string): Promise<Note> {
  return post<Note>('/api/notes', { content, ngram_vector, title_ct });
}

export async function listNotes(limit = 20): Promise<{ notes: Note[] }> {
  const res = await fetch(`/api/notes?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { notes: Note[] };
}

export function searchNotes(ngram_vector: number[]): Promise<{ results: SearchResult[] }> {
  return post<{ results: SearchResult[] }>('/api/search', { ngram_vector });
}