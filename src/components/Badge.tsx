import './Badge.css';

/**
 * Verification badge: `✓ 验证成功` (ok = solid) vs `✗ 验证失败` (sim = outline).
 */
export default function Badge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? 'badge--ok' : 'badge--sim'}`}>{label}</span>;
}
