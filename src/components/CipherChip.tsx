import { useState } from 'react';
import './CipherChip.css';

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // 旧环境降级方案
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

/** 展示密文（截断）+ 复制按钮；点击复制完整密文。 */
export default function CipherChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await copyToClipboard(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // 剪贴板不可用则静默失败
    }
  }

  return (
    <div className="cipher-chip">
      <span className="cipher-chip__label">密文</span>
      <code className="cipher-chip__code selectable">{value.slice(0, 22)}…</code>
      <button type="button" className="cipher-chip__copy" onClick={handleCopy}>
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
}
