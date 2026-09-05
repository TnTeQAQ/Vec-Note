import { bls12_381, bls12_381_Fr } from '@noble/curves/bls12-381.js';
import { sha256 } from '@noble/hashes/sha2.js';

// 私钥种子 —— 即用户语义里的「解密成功」字样。
export const SEED = '解密成功';

// longSignatures：G1 公钥(48B) + G2 签名(96B)。BLS12-381 是零知识证明同族的配对友好曲线，
// 签名具有确定性、且无法从签名反推被签的原文。
const bls = bls12_381.longSignatures;

// sk = SHA-256("解密成功") mod r（r 为 BLS12-381 标量域阶）。
// bls12_381_Fr.fromBytes 会对 256 位摘要做 mod r 归一化，得到合法标量。
function deriveSecretKey(): Uint8Array {
  const digest = sha256(new TextEncoder().encode(SEED));
  const scalar = bls12_381_Fr.fromBytes(digest);
  return bls12_381_Fr.toBytes(scalar);
}

const SECRET_KEY = deriveSecretKey();
const PUBLIC_KEY = bls.getPublicKey(SECRET_KEY).toBytes(true); // 48 字节压缩点

/** 公钥（base64url），仅用于验签。 */
export function publicKey(): string {
  return bytesToBase64url(PUBLIC_KEY);
}

function canonical(s: string): string {
  return s.normalize('NFC').trim();
}

/**
 * 「加密」：对标题做 BLS 签名，返回 base64url 的密文串（即用户示例里的 asdf1212e 形态）。
 * 同一标题得到同一密文；标题明文从不进入密文可反推的范围。
 */
export function signTitle(title: string): string {
  const msg = canonical(title);
  const point = bls.hash(new TextEncoder().encode(msg));
  const sig = bls.sign(point, SECRET_KEY);
  return bytesToBase64url(sig.toBytes(true)); // 96 字节压缩签名
}

/**
 * 「解密」：公钥 + 候选明文 + 密文 → 验签通过返回 true（界面显示「解密成功」），
 * 否则返回 false（相似候选）。这是标题身份的唯一验证通道。
 */
export function verifyTitle(ciphertext: string, candidate: string): boolean {
  if (!ciphertext) return false;
  const msg = canonical(candidate);
  const point = bls.hash(new TextEncoder().encode(msg));
  try {
    const sig = base64urlToBytes(ciphertext);
    return bls.verify(sig, point, PUBLIC_KEY);
  } catch {
    return false;
  }
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}