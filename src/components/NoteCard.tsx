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
 * 留言条目（留言板风格）：指纹 + ID / 去验证 / 时间一行头，内容随下，
 * 行与行之间用细分隔线——不是卡片盒子。verify 显示「去验证」入口。
 */
export default function NoteCard({ note, verify = false }: { note: Note; verify?: boolean }) {
  const startReveal = usePageReveal();

  const goVerify = (e: React.MouseEvent) => {
    e.stopPropagation();
    stageVerifyCipher(note.ciphertext);
    startReveal('lab', e.clientX, e.clientY);
  };

  return (
    <article className="note">
      <div className="note__head">
        <CipherChip value={note.ciphertext} />
        <span className="note__id">#{note.id.slice(0, 8)}</span>
        <span className="note__fill" />
        {verify && (
          <button type="button" className="note__verify" onClick={goVerify}>
            去验证
          </button>
        )}
        <span className="note__time">{relTime(note.created_at)}</span>
      </div>
      <p className="note__content selectable">{note.content}</p>
    </article>
  );
}
