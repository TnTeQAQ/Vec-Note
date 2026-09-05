import { useState } from 'react';
import { textHue } from '../lib/color';
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

/**
 * 密文指纹：前六个字符 + 由密文哈希出的稳定标识色。
 * 点击胶囊即复制完整密文，悬停反色；无标签、无独立复制按钮。
 */
export default function CipherChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const hue = textHue(value);

  async function handleClick() {
    try {
      await copyToClipboard(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // 剪贴板不可用则静默失败
    }
  }

  return (
    <button
      type="button"
      className="cipher-chip"
      style={{ '--chip-c': `hsl(${hue}, 68%, 46%)` } as React.CSSProperties}
      onClick={handleClick}
      title="点击复制完整密文"
      aria-label="复制完整密文"
    >
      {copied ? '已复制' : value.slice(0, 6)}
    </button>
  );
}
