import { describe, expect, it } from 'vitest';
import { embed, dot } from './embed';

describe('embed (char n-gram hashing)', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(embed('手机'))).toBe(JSON.stringify(embed('手机')));
  });

  it('returns null for empty / punctuation-only input', () => {
    expect(embed('')).toBeNull();
    expect(embed('   ')).toBeNull();
    expect(embed('，。！？')).toBeNull();
  });

  it('normalizes to unit norm', () => {
    const v = embed('手机')!;
    let s = 0;
    for (const x of v) s += x * x;
    expect(Math.sqrt(s)).toBeCloseTo(1, 6);
  });

  it('让「手」与「手机」重叠（共享字符）', () => {
    const a = embed('手')!;
    const b = embed('手机')!;
    expect(dot(a, b)).toBeGreaterThan(0.1);
  });

  it('让「手机」与「电话」不相交（无共享字符）', () => {
    const a = embed('手机')!;
    const b = embed('电话')!;
    expect(dot(a, b)).toBeCloseTo(0, 9);
  });

  it('same title yields cosine 1', () => {
    const a = embed('测试标题')!;
    const b = embed('测试标题')!;
    expect(dot(a, b)).toBeCloseTo(1, 6);
  });
});