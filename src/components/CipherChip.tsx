import { cipherColor } from '../lib/color';
import './CipherChip.css';

/**
 * 密文指纹：前六个字符 + 由密文哈希出的稳定标识色。
 * 仅作展示，无交互。
 */
export default function CipherChip({ value }: { value: string }) {
  return (
    <span
      className="cipher-chip"
      style={{ '--chip-c': cipherColor(value) } as React.CSSProperties}
    >
      {value.slice(0, 6)}
    </span>
  );
}
