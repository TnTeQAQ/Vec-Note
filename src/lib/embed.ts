import {
  EMBED_NOISE_SIGMA,
  TERM_KEEP_PROBABILITY,
  VECTOR_DIM,
} from '../shared/constants';

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

// mulberry32 伪随机数生成器（可播种，测试用）。
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller 变换：均匀随机数 → 标准正态。
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type EmbedOptions = {
  /**
   * 存储模式：按 TERM_KEEP_PROBABILITY 随机丢弃部分 n-gram 词项，使子字
   * 检索呈概率性命中。检索（查询）侧不要开启，否则同词搜索也可能落空。
   */
  forStorage?: boolean;
  /** 固定随机种子（测试用）；缺省时每次调用使用真随机。 */
  seed?: number;
};

/**
 * 对标题做字符 n-gram 特征哈希，并注入两层随机性后输出 L2 归一化向量：
 *
 * 1. 高斯抖动（always）：相对强度 σ 的密集噪声，使同一文本两次嵌入的
 *    余弦期望 ≈ 1/(1+σ²)——同词检索相似度永不达到 100%；
 * 2. 词项随机丢弃（仅 forStorage）：存储侧按概率保留词项，使子字查询
 *    「有可能命中、也有可能不命中」。
 *
 * 该向量只用于「找相似候选」，不负责证明标题身份（那由 BLS 验签负责）。
 * 规范化后为空返回 null。
 */
export function embed(text: string, opts: EmbedOptions = {}): number[] | null {
  const s = normalize(text);
  if (!s.length) return null;

  const rand = opts.seed === undefined ? Math.random : mulberry32(opts.seed);
  const terms = ngramsOf(Array.from(s));

  // 存储模式随机丢弃词项；全部被丢弃时兜底保留完整词项，保证向量非空。
  const kept: string[] = [];
  if (opts.forStorage) {
    for (const term of terms) if (rand() < TERM_KEEP_PROBABILITY) kept.push(term);
    if (kept.length === 0) kept.push(...terms);
  } else {
    kept.push(...terms);
  }

  const vec = new Array<number>(VECTOR_DIM).fill(0);
  for (const term of kept) {
    const h = fnv1a32(term);
    const idx = h % VECTOR_DIM;
    const sign = (h >>> 31) === 0 ? 1 : -1;
    vec[idx] += sign;
  }

  // 相对强度固定的高斯抖动（密集）：噪声范数 ≈ σ·‖信号‖，与标题长度无关。
  let normSq = 0;
  for (const x of vec) normSq += x * x;
  const amp = (EMBED_NOISE_SIGMA * Math.sqrt(normSq)) / Math.sqrt(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i++) vec[i] += amp * gaussian(rand);

  let noisyNormSq = 0;
  for (const x of vec) noisyNormSq += x * x;
  const norm = Math.sqrt(noisyNormSq);
  if (norm === 0) return null;

  return vec.map((x) => x / norm);
}

/** 点积（向量已归一化时即余弦相似度）。用于测试与演示。 */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] || 0) * (b[i] || 0);
  return s;
}
