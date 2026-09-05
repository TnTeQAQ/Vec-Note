import { describe, expect, it } from 'vitest';
import { signTitle } from './crypto';
import { decryptTitle } from './decrypt';

describe('decrypt (解密模块)', () => {
  it('exact match → 解密成功', () => {
    const ct = signTitle('手机');
    expect(decryptTitle(ct, '手机')).toEqual({ ok: true, label: '解密成功' });
  });

  it('fuzzy mismatch → 相似候选', () => {
    const ct = signTitle('手机');
    expect(decryptTitle(ct, '手')).toEqual({ ok: false, label: '相似候选' });
    expect(decryptTitle(ct, '电话')).toEqual({ ok: false, label: '相似候选' });
  });

  it('empty ciphertext → 相似候选 (不抛异常)', () => {
    expect(decryptTitle('', '手机')).toEqual({ ok: false, label: '相似候选' });
  });
});