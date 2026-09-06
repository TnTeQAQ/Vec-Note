import CipherChip from './CipherChip';
import { usePageReveal } from './page-reveal-context';
import { stageVerifyCipher } from '../lib/verify-handoff';
import type { Note } from '../lib/api';
import './NoteCard.css';

export function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

/**
 * 留言卡片：密文 chip + 内容 + meta。视觉参考 blog_site 的 PostCard
 * （2px 实线边框、悬停反色），但留言卡不可点击跳转。
 * 在已按密文分组的容器里传 hideChip 省略重复的密文标识；
 * 传 verify 时在 meta 上显示「去验证」——点击携带密文跳转实验台。
 */
export default function NoteCard({
  note,
  hideChip = false,
  verify = false,
}: {
  note: Note;
  hideChip?: boolean;
  verify?: boolean;
}) {
  const startReveal = usePageReveal();

  const goVerify = (e: React.MouseEvent) => {
    e.stopPropagation();
    stageVerifyCipher(note.ciphertext);
    startReveal('lab', e.clientX, e.clientY);
  };

  return (
    <article className="note-card">
      <div className="note-card__top">
        {!hideChip && <CipherChip value={note.ciphertext} />}
        {verify && (
          <button type="button" className="note-card__verify" onClick={goVerify}>
            去验证
          </button>
        )}
      </div>
      <p className="note-card__content selectable">{note.content}</p>
      <div className="note-card__meta">
        <span className="note-card__id">#{note.id.slice(0, 8)}</span>
        <span>{relTime(note.created_at)}</span>
      </div>
    </article>
  );
}
