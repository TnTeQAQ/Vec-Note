import { useEffect, useRef, useState } from 'react';
import CipherChip from './CipherChip';
import Modal from './Modal';
import RichText from './RichText';
import VerifyModal from './VerifyModal';
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

/** 置顶图标（图钉）：颜色跟随 currentColor，由 CSS 控制。 */
function PinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M916.8 380.8L645 109.4c-7.2-7.2-16.5-10.7-25.9-10.7-9.4 0-18.8 3.5-25.9 10.7L415.5 286.9c-13.5-1.5-27-2.2-40.6-2.2-80.7 0-161.5 26.5-227.8 79.6-17 13.5-18.4 39-3 54.4l200.4 200.1L106.9 856c-2.9 2.9-4.7 6.7-5.1 10.8l-3.7 41c-1 10.4 7.3 19.2 17.5 19.2 0.6 0 1.1 0 1.7-0.1l41-3.7c4.1-0.3 7.9-2.2 10.8-5.1l237.6-237.3 200.4 200.1c7.2 7.2 16.5 10.7 25.9 10.7 10.7 0 21.3-4.6 28.6-13.7 62.1-77.4 87.9-174.4 77.4-268.1l177.7-177.4c14.4-14.2 14.4-37.3 0.1-51.6zM682.9 553.9l-27 27 4.2 37.9c4.1 37.1 1.1 74-9 109.8-6 20.9-14.1 40.9-24.5 59.7L237 399.2c14.2-7.8 29-14.4 44.5-19.7 30-10.4 61.4-15.5 93.4-15.5 10.6 0 21.3 0.5 31.9 1.8l37.9 4.2 174.5-174.3 211.2 210.9-147.5 147.3z m0 0"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * 留言条目（留言板风格）：指纹 + ID / 去验证 / 时间一行头，内容随下，
 * 行与行之间用细分隔线。内容渲染为净化后的 Markdown；
 * 过长时在列表里截断，点「查看全文」在弹窗里看完整内容。
 * admin：管理模式（登录后），显示删除入口。
 */
export default function NoteCard({
  note,
  verify = false,
  admin = false,
  onDelete,
  onPin,
  pinBusy = false,
}: {
  note: Note;
  verify?: boolean;
  admin?: boolean;
  onDelete?: (note: Note) => void;
  onPin?: (note: Note) => void;
  pinBusy?: boolean;
}) {
  const [openDetail, setOpenDetail] = useState(false);
  const [openVerify, setOpenVerify] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

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
    setOpenVerify(true);
  };

  return (
    <article className="note">
      <div className="note__head">
        <CipherChip value={note.ciphertext} />
        <span className="note__id">#{note.id.slice(0, 8)}</span>
        {note.pinned && (
          <span className="note__pin-badge" title="置顶">
            <PinIcon size={12} />
          </span>
        )}
        <span className="note__fill" />
        {verify && (
          <button type="button" className="note__verify" onClick={goVerify}>
            去验证
          </button>
        )}
        {admin && onPin && (
          <button
            type="button"
            className="note__pin"
            onClick={() => onPin(note)}
            disabled={pinBusy}
          >
            {note.pinned ? '取消置顶' : '置顶'}
          </button>
        )}
        {admin && onDelete && (
          <button type="button" className="note__delete" onClick={() => onDelete(note)}>
            删除
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

      <Modal
        open={openDetail}
        title="留言详情"
        size="lg"
        scrollBody={false}
        onClose={() => setOpenDetail(false)}
      >
        <div className="note-detail">
          <div className="note-detail__head">
            <CipherChip value={note.ciphertext} />
            <span className="note__time">
              #{note.id.slice(0, 8)} · {new Date(note.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="note-detail__body selectable">
            <RichText markdown={note.content} />
          </div>
        </div>
      </Modal>

      <VerifyModal
        open={openVerify}
        cipher={note.ciphertext}
        onClose={() => setOpenVerify(false)}
      />
    </article>
  );
}
