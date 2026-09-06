/// <reference types="@cloudflare/workers-types" />

// 管理员密码哈希：PBKDF2-HMAC-SHA256 + 随机盐，纯 Web Crypto 实现。
// 存储格式：pbkdf2$sha256$<iterations>$<salt_b64url>$<hash_b64url>
// Worker 与 Node(测试) 环境均可运行。

// Cloudflare Workers 生产环境的 WebCrypto 限制 PBKDF2 迭代次数 ≤ 100000
// （超出会抛 NotSupportedError → 500）。本地 wrangler dev 不强制该限制，
// 因此必须在 100000 以内取值，否则部署后登录接口直接 500。
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_ITERATIONS_MAX = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const enc = new TextEncoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 拷贝为独立的 ArrayBuffer，规避 Uint8Array<ArrayBufferLike> 与 WebCrypto BufferSource 的泛型差异 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** 生成新密码的哈希串（含随机盐）。 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${bytesToB64url(salt)}$${bytesToB64url(hash)}`;
}

/** 校验明文密码与存储哈希是否匹配。格式非法时返回 false。 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;
  const iterations = Number(parts[2]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  // 超出平台上限的历史哈希无法在校验时计算：直接视为不匹配，
  // 避免 crypto.subtle 抛 NotSupportedError 导致 500。
  if (iterations > PBKDF2_ITERATIONS_MAX) return false;
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = b64urlToBytes(parts[3]);
    expected = b64urlToBytes(parts[4]);
  } catch {
    return false;
  }
  if (expected.length !== KEY_BITS / 8) return false;
  const actual = await pbkdf2(password, salt, iterations);
  return constantTimeEqual(actual, expected);
}
