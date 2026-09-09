import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/** 收起动画时长（与 Modal.css 中 modal-*-out 的时长保持一致） */
const CLOSE_MS = 160;

export default function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
  scrollBody = true,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** md：常规表单；lg：长文详情 */
  size?: 'md' | 'lg';
  /** false 时正文区不滚动，由 children 自行布局内部滚动区（如详情弹窗头脚固定） */
  scrollBody?: boolean;
}) {
  // 关闭时先播放收起动画再卸载：open 转 false 时进入 closing 态，
  // CLOSE_MS 后真正移除 DOM
  const [closing, setClosing] = useState(false);
  const [render, setRender] = useState(open);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setRender(true);
      return;
    }
    if (!render) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setRender(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = window.setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open, render]);

  // Esc 关闭
  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [render, closing, onClose]);

  // 弹窗存在期间（含收起动画）锁定背景滚动
  useEffect(() => {
    if (!render) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [render]);

  if (!render) return null;

  // portal 到 body：留言卡等含 content-visibility/transform 的容器会把
  // position: fixed 的弹窗“关”在容器内，导致弹窗显示在卡片框里而非网页层。
  return createPortal(
    <div
      className={`modal${closing ? ' modal--closing' : ''}`}
      onMouseDown={(e) => {
        // 点背景关闭（面板内点击不冒泡到背景）；收起中忽略重复触发
        if (e.target === e.currentTarget && !closing) onClose();
      }}
    >
      <div
        className={`modal__panel modal__panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className={scrollBody ? 'modal__body' : 'modal__body modal__body--noscroll'}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
