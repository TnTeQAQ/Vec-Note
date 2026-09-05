const KEY = 'vec-note:pending-verify-cipher';

/**
 * 搜索卡片 → 解密实验台的密文交接。
 * 卡片上点「去验证」时写入，实验台挂载时取出并清空——只填入，不自动验证。
 */
export function stageVerifyCipher(cipher: string) {
  try {
    sessionStorage.setItem(KEY, cipher);
  } catch {
    /* storage unavailable */
  }
}

export function takeVerifyCipher(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    if (value !== null) sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
