import { VECTOR_DIM } from '../shared/constants';

// 只保留字母与数字（含汉字），去除空白与标点：
// 「手机」 -> 「手机」，「手，机」 -> 「手机」。
function normalize(text: string): string {
  return Array.from(text.normalize('NFC').toLowerCase())
    .filter((ch) => /\p{L}|\p{N}/u.test(ch))
    .join('');
}

// FNV-1a 32 位哈希。
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// 词项 = 全部单字（unigram）+ 相邻双字（bigram）。按 Unicode 码点切分。
function ngramsOf(chars: string[]): string[] {
  const out: string[] = chars.slice();
  for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
  return out;
}

/**
 * 对标题做字符 n-gram 特征哈希，输出 L2 归一化的公开向量。
 * 该向量只用于“找相似候选”，不负责证明标题身份（那由 BLS 验签负责）。
 * 规范化后为空返回 null。
 */
export function embed(text: string): number[] | null {
  const s = normalize(text);
  if (!s.length) return null;

  const vec = new Array<number>(VECTOR_DIM).fill(0);
  for (const term of ngramsOf(Array.from(s))) {
    const h = fnv1a32(term);
    const idx = h % VECTOR_DIM;
    const sign = (h >>> 31) === 0 ? 1 : -1;
    vec[idx] += sign;
  }

  let normSq = 0;
  for (const x of vec) normSq += x * x;
  const norm = Math.sqrt(normSq);
  if (norm === 0) return null;

  return vec.map((x) => x / norm);
}

/** 点积（向量已归一化时即余弦相似度）。用于测试与演示。 */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] || 0) * (b[i] || 0);
  return s;
}