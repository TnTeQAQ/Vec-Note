import { describe, expect, it } from 'vitest';
import { SEED, publicKey, signTitle, verifyTitle } from './crypto';

describe('crypto (BLS12-381 signature-as-ciphertext)', () => {
  it('uses "解密成功" as seed', () => {
    expect(SEED).toBe('解密成功');
  });

  it('exposes a public key', () => {
    expect(publicKey()).toBeTruthy();
    expect(publicKey().length).toBeGreaterThan(20);
  });

  it('signature is deterministic for the same title', () => {
    expect(signTitle('手机')).toBe(signTitle('手机'));
  });

  it('verify(sign(title), title) === true  → 解密成功', () => {
    const ct = signTitle('手机');
    expect(verifyTitle(ct, '手机')).toBe(true);
  });

  it('verify against a different title === false', () => {
    const ct = signTitle('手机');
    expect(verifyTitle(ct, '电话')).toBe(false);
    expect(verifyTitle(ct, '手')).toBe(false);
  });

  it('tampered ciphertext fails verification', () => {
    const ct = signTitle('手机');
    const tampered = ct.slice(0, -1) + (ct.endsWith('A') ? 'B' : 'A');
    expect(verifyTitle(tampered, '手机')).toBe(false);
  });

  it('whitespace is trimmed before signing/verifying', () => {
    const ct = signTitle('  手机  ');
    expect(verifyTitle(ct, '手机')).toBe(true);
  });
});