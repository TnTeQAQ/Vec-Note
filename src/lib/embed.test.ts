import { describe, expect, it } from 'vitest';
import { embed, dot } from './embed';
import { EMBED_NOISE_SIGMA } from '../shared/constants';

const cos = (a: number[], b: number[]) => dot(a, b);

describe('embed (char n-gram hashing + jitter/dropout)', () => {
  it('returns null for empty / punctuation-only input', () => {
    expect(embed('')).toBeNull();
    expect(embed('   ')).toBeNull();
    expect(embed('，。！？')).toBeNull();
  });

  it('normalizes to unit norm', () => {
    for (const [text, seed] of [
      ['手机', 1],
      ['测试标题', 2],
      ['手', 3],
    ] as const) {
      const v = embed(text, { seed })!;
      let s = 0;
      for (const x of v) s += x * x;
      expect(Math.sqrt(s)).toBeCloseTo(1, 6);
    }
  });

  it('same seed reproduces the same vector', () => {
    const a = embed('手机', { seed: 42 })!;
    const b = embed('手机', { seed: 42 })!;
    expect(dot(a, b)).toBeCloseTo(1, 9);
  });

  it('同一文本两次独立嵌入向量不同，余弦永不达到 100%', () => {
    for (const text of ['手机', '测试标题', 'hello']) {
      const a = embed(text, { seed: 11 })!;
      const b = embed(text, { seed: 12 })!;
      const c = cos(a, b);
      expect(c).toBeLessThan(0.999);
      expect(c).toBeGreaterThan(0.5);
    }
  });

  it('单字标题也不会 100%（密集抖动避免一维向量互相平行）', () => {
    const a = embed('手', { seed: 21 })!;
    const b = embed('手', { seed: 22 })!;
    const c = cos(a, b);
    expect(c).toBeLessThan(0.999);
    expect(c).toBeGreaterThan(0.5);
  });

  it('同词余弦接近理论值 1/(1+σ²)', () => {
    const expected = 1 / (1 + EMBED_NOISE_SIGMA * EMBED_NOISE_SIGMA);
    let sum = 0;
    const N = 12;
    for (let s = 0; s < N; s++) {
      sum += cos(embed('手机', { seed: s })!, embed('手机', { seed: 100 + s })!);
    }
    const mean = sum / N;
    expect(mean).toBeGreaterThan(expected - 0.04);
    expect(mean).toBeLessThan(expected + 0.04);
  });

  it('无关词「手机」vs「电话」重叠只剩噪声级（低于 5% 阈值）', () => {
    for (const s1 of [1, 2, 3]) {
      for (const s2 of [4, 5, 6]) {
        const c = cos(embed('手机', { seed: s1 })!, embed('电话', { seed: s2 })!);
        expect(Math.abs(c)).toBeLessThan(0.05);
      }
    }
  });

  it('存储模式随机丢弃：子字「手」约七成概率命中（检索侧为完整词项）', () => {
    const q = embed('手', { seed: 100 })!;
    const N = 40;
    let hits = 0;
    for (let s = 0; s < N; s++) {
      const stored = embed('手机', { forStorage: true, seed: s })!;
      if (cos(q, stored) > 0.05) hits++;
    }
    const rate = hits / N;
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.92);
  });

  it('存储模式兜底：词项不会被全部丢光（同词必可召回）', () => {
    const q = embed('手机', { seed: 999 })!;
    for (let s = 0; s < 30; s++) {
      const stored = embed('手机', { forStorage: true, seed: s })!;
      expect(cos(q, stored)).toBeGreaterThan(0.3);
    }
  });
});
