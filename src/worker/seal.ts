import { sha256 } from '@noble/hashes/sha2.js';
import { VECTOR_DIM } from '../shared/constants';

export interface SealKey {
  perm: number[]; // 随机置换 π：[0, DIM) -> [0, DIM)
  signs: number[]; // 每维 ±1
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function uint32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

/**
 * 由服务端密钥确定性地生成「签名置换」密钥。
 * 使用 SHA-256 计数器流作为确定性 PRNG（可在 Worker 中无随机源安全复现）。
 */
export function makeSealKey(secret: string): SealKey {
  const seed = sha256(new TextEncoder().encode('vec-note-seal\0' + secret));
  let counter = 0;
  let block = new Uint8Array(0);
  let off = 0;

  const nextWord = (): number => {
    if (off + 4 > block.length) {
      block = sha256(concatBytes(seed, uint32be(counter++)));
      off = 0;
    }
    const w =
      ((block[off] << 24) | (block[off + 1] << 16) | (block[off + 2] << 8) | block[off + 3]) >>> 0;
    off += 4;
    return w;
  };

  const perm = Array.from({ length: VECTOR_DIM }, (_, i) => i);
  // Fisher-Yates。
  for (let i = VECTOR_DIM - 1; i > 0; i--) {
    const j = nextWord() % (i + 1);
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }

  const signs = new Array<number>(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i++) signs[i] = (nextWord() & 1) === 0 ? 1 : -1;

  return { perm, signs };
}

/**
 * 密封：out[π(i)] = s_i · v[i]。置换 + 每维 ±1 构成正交矩阵，
 * 因此精确保持余弦相似度（「手→手机」等命中行为不变），
 * 同时把「字符→哈希桶」的位置映射打乱，无密钥无法从密封向量反推字符。
 */
export function seal(v: number[], key: SealKey): number[] {
  const out = new Array<number>(VECTOR_DIM).fill(0);
  for (let i = 0; i < VECTOR_DIM; i++) {
    out[key.perm[i]] = key.signs[i] * (v[i] || 0);
  }
  return out;
}