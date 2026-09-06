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
});
