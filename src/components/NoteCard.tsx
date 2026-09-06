import { useEffect, useRef, useState } from 'react';
import CipherChip from './CipherChip';
import Modal from './Modal';
import RichText from './RichText';
import { usePageReveal } from './page-reveal-context';
import { stageVerifyCipher } from '../lib/verify-handoff';
import { renderRichText } from '../lib/rich';
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
 * 行与行之间用细分隔线。内容渲染为净化后的 Markdown；
 * 过长时在列表里截断，点「查看全文」在弹窗里看完整内容。
 */
export default function NoteCard({ note, verify = false }: { note: Note; verify?: boolean }) {
  const startReveal = usePageReveal();
  const [openDetail, setOpenDetail] = useState(false);
  const [copiedDetail, setCopiedDetail] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // 复制留言纯文本（剥离 Markdown 标记与样式标签）
  async function copyContent() {
    const holder = document.createElement('div');
    holder.innerHTML = renderRichText(note.content);
    const text = (holder.textContent ?? '').trim();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedDetail(true);
      window.setTimeout(() => setCopiedDetail(false), 1200);
    } catch {
      /* 剪贴板不可用则静默失败 */
    }
  }

  // 内容超过截断高度时显示「查看全文」
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [note.content]);

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

      <div
        className={`note__content selectable${overflowing ? ' note__content--clipped' : ''}`}
        ref={contentRef}
      >
        <RichText markdown={note.content} />
      </div>

      {overflowing && (
        <div className="note__expand">
          <button type="button" className="note__expand-btn" onClick={() => setOpenDetail(true)}>
            查看全文
          </button>
        </div>
      )}

      <Modal open={openDetail} title="留言详情" size="lg" onClose={() => setOpenDetail(false)}>
        <div className="note-detail">
          <div className="note-detail__head">
            <CipherChip value={note.ciphertext} />
            <span className="note__time">
              #{note.id.slice(0, 8)} · {new Date(note.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
          <RichText markdown={note.content} />
          <div className="note-detail__actions">
            <button type="button" className="note-detail__copy" onClick={copyContent}>
              {copiedDetail ? '已复制' : '复制留言'}
            </button>
          </div>
        </div>
      </Modal>
    </article>
  );
}
