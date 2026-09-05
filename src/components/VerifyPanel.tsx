import { useState } from 'react';
import { decryptTitle } from '../lib/decrypt';
import Button from './Button';
import Badge from './Badge';
import './VerifyPanel.css';

/**
 * 解密实验台核心块：粘贴密文 + 输入候选标题 → 前端 BLS 验签，
 * 验签通过即「解密成功」，否则是相似候选。
 */
export default function VerifyPanel() {
  const [cipher, setCipher] = useState('');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const c = cipher.trim();
    const t = title.trim();
    if (!c || !t) return;

    const outcome = decryptTitle(c, t);
    setResult(
      outcome.ok
        ? { ok: true, text: '解密成功' }
        : { ok: false, text: '验证失败：该密文不是由这个标题生成的' },
    );
  }

  return (
    <section className="verify-panel">
      <form className="verify-panel__form" onSubmit={handleVerify}>
        <label className="field-label" htmlFor="verify-cipher">
          密文
        </label>
        <input
          className="field"
          id="verify-cipher"
          value={cipher}
          onChange={(e) => setCipher(e.target.value)}
          placeholder="请输入密文"
          autoComplete="off"
        />
        <label className="field-label" htmlFor="verify-title">
          标题明文
        </label>
        <input
          className="field"
          id="verify-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入手机"
          autoComplete="off"
        />
        <div className="verify-panel__actions">
          <Button type="submit" variant="solid" disabled={!cipher.trim() || !title.trim()}>
            解密 / 核查
          </Button>
        </div>
      </form>
      {result && (
        <div className={`verify-panel__result ${result.ok ? 'verify-panel__result--ok' : ''}`}>
          <Badge ok={result.ok} label={result.ok ? '✓ 解密成功' : '✗ 验证失败'} />
          <span className="verify-panel__result-text">{result.text}</span>
        </div>
      )}
    </section>
  );
}
