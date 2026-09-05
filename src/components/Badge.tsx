import './Badge.css';

/**
 * Verification badge: `解密成功` (ok = solid) vs `相似候选` (sim = outline).
 */
export default function Badge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? 'badge--ok' : 'badge--sim'}`}>{label}</span>;
}
