import { verifyTitle } from './crypto';

export interface DecryptResult {
  ok: boolean;
  label: string;
}

/**
 * 「解密」模块：给定密文与候选标题明文，判断该密文是否由该明文生成。
 * 这是标题身份的唯一验证通道 —— 向量检索只负责召回相似候选，不负责证明标题。
 *
 * - 成功 → { ok: true, label: '解密成功' }
 * - 失败 → { ok: false, label: '相似候选' }
 */
export function decryptTitle(ciphertext: string, candidate: string): DecryptResult {
  return verifyTitle(ciphertext, candidate)
    ? { ok: true, label: '解密成功' }
    : { ok: false, label: '相似候选' };
}