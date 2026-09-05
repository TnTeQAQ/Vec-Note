import { describe, expect, it } from 'vitest';
import { VECTOR_DIM } from '../shared/constants';
import { embed } from '../lib/embed';
import { makeSealKey, seal } from '../worker/seal';

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
});