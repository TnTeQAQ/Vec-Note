import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password (PBKDF2 hash store)', () => {
  it('hashes and verifies a password round-trip', async () => {
    const stored = await hashPassword('admin');
    expect(stored.startsWith('pbkdf2$sha256$')).toBe(true);
    expect(await verifyPassword('admin', stored)).toBe(true);
    expect(await verifyPassword('wrong', stored)).toBe(false);
  });

  it('uses a fresh random salt each time', async () => {
    const a = await hashPassword('secret');
    const b = await hashPassword('secret');
    expect(a).not.toBe(b);
    expect(await verifyPassword('secret', a)).toBe(true);
    expect(await verifyPassword('secret', b)).toBe(true);
  });

  it('rejects malformed stored strings', async () => {
    expect(await verifyPassword('admin', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('admin', 'pbkdf2$sha256$1000$bad')).toBe(false);
    expect(await verifyPassword('admin', '')).toBe(false);
  });

  it('rejects stored hashes above the Cloudflare PBKDF2 cap without throwing', async () => {
    // Workers 生产环境 WebCrypto 限制迭代次数 ≤ 100000；超限历史哈希应判不匹配而非抛 500
    const overCap = 'pbkdf2$sha256$100001$AQIDBAUGBwgJCgsMDQ4PEA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(await verifyPassword('admin', overCap)).toBe(false);
  });
});
