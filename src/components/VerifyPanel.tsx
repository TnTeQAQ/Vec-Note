import { useState } from 'react';
import { decryptTitle } from '../lib/decrypt';
import Button from './Button';
import Badge from './Badge';
import './VerifyPanel.css';

/**
 * 解密实验台核心块：粘贴密文 + 输入候选标题 → 前端 BLS 验签，
 * 通过显示「✓ 验证成功」，失败显示「✗ 验证失败」。
 */
export default function VerifyPanel() {
  const [cipher, setCipher] = useState('');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<boolean | null>(null);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const c = cipher.trim();
    const t = title.trim();
    if (!c || !t) return;

    setResult(decryptTitle(c, t).ok);
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
          placeholder="请输入标题明文"
          autoComplete="off"
        />
        <div className="verify-panel__actions">
          <Button type="submit" variant="solid" disabled={!cipher.trim() || !title.trim()}>
            解密 / 核查
          </Button>
        </div>
      </form>
      {result !== null && (
        <div className={`verify-panel__result ${result ? 'verify-panel__result--ok' : ''}`}>
          <Badge ok={result} label={result ? '✓ 验证成功' : '✗ 验证失败'} />
          {!result && (
            <span className="verify-panel__result-text">该密文不是由这个标题生成的</span>
          )}
        </div>
      )}
    </section>
  );
}
