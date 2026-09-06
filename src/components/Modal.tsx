import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

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
  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 弹窗打开时锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // portal 到 body：留言卡等含 content-visibility/transform 的容器会把
  // position: fixed 的弹窗“关”在容器内，导致弹窗显示在卡片框里而非网页层。
  return createPortal(
    <div
      className="modal"
      onMouseDown={(e) => {
        // 点背景关闭（面板内点击不冒泡到背景）
        if (e.target === e.currentTarget) onClose();
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
