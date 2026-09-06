import { describe, expect, it } from 'vitest';
import { VECTOR_DIM, SHARED_SLOT_ABS_MIN } from '../shared/constants';
import { embed } from '../lib/embed';
import { makeSealKey, seal, countSharedSlots } from '../worker/seal';

function cos(a: number[], b: number[]): number {
  let d = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

describe('seal (signed permutation)', () => {
  it('produces a valid permutation', () => {
    const key = makeSealKey('secret');
    expect(key.perm).toHaveLength(VECTOR_DIM);
    expect([...key.perm].sort((a, b) => a - b)).toEqual(Array.from({ length: VECTOR_DIM }, (_, i) => i));
  });

  it('is deterministic per secret', () => {
    const a = makeSealKey('secret');
    const b = makeSealKey('secret');
    expect(a.perm).toEqual(b.perm);
    expect(a.signs).toEqual(b.signs);
  });

  it('preserves cosine similarity exactly', () => {
    const key = makeSealKey('some-secret');
    const v = embed('手机')!;
    const t = embed('手')!;
    const sv = seal(v, key);
    const st = seal(t, key);
    expect(cos(sv, st)).toBeCloseTo(cos(v, t), 9);
  });

  it('different secrets yield unrelated seals', () => {
    const v = embed('手机')!;
    const a = seal(v, makeSealKey('secret-a'));
    const b = seal(v, makeSealKey('secret-b'));
    expect(a).not.toEqual(b);
  });

  describe('countSharedSlots（共享显著 n-gram 哈希槽位）', () => {
    it('只统计同号且两边都超过阈值显著槽位', () => {
      const a = new Array<number>(8).fill(0);
      const b = new Array<number>(8).fill(0);
      // 槽 0：同号且显著 → 计数
      a[0] = SHARED_SLOT_ABS_MIN * 2;
      b[0] = SHARED_SLOT_ABS_MIN * 3;
      // 槽 1：同号但 b 太弱 → 不计
      a[1] = SHARED_SLOT_ABS_MIN * 2;
      b[1] = SHARED_SLOT_ABS_MIN * 0.5;
      // 槽 2：a 太弱 → 不计
      a[2] = SHARED_SLOT_ABS_MIN * 0.5;
      b[2] = SHARED_SLOT_ABS_MIN * 2;
      // 槽 3：异号 → 不计
      a[3] = SHARED_SLOT_ABS_MIN * 2;
      b[3] = -SHARED_SLOT_ABS_MIN * 2;
      // 槽 4：同号且显著 → 计数
      a[4] = -SHARED_SLOT_ABS_MIN * 2;
      b[4] = -SHARED_SLOT_ABS_MIN * 2;
      expect(countSharedSlots(a, b)).toBe(2);
    });

    it('密封不改变共享槽位计数（带符号置换保持绝对值与同号关系）', () => {
      const key = makeSealKey('shared-slot-secret');
      const v = embed('手机')!;
      const t = embed('手机')!;
      const sv = seal(v, key);
      const st = seal(t, key);
      expect(countSharedSlots(sv, st)).toBe(countSharedSlots(v, t));
      expect(countSharedSlots(sv, st)).toBeGreaterThan(0);
    });
  });
});
