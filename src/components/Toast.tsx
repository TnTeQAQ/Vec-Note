import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './Toast.css';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastApi {
  /** 弹出一条提示，默认 3.2s 自动消失；最多同时展示 3 条 */
  toast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** 圆环 + 图形描边图标（成功 ✓ / 失败 ✗ / 提示 i），随 currentColor 取色 */
function CheckIcon() {
  return (
    <svg
      className="toast__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M7.3 12.3l3 3.2 6.3-6.8" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="toast__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.3 8.3l7.4 7.4" />
      <path d="M15.7 8.3l-7.4 7.4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="toast__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 11.2v4.6" />
      <path d="M12 7.4v.1" />
    </svg>
  );
}

const KIND_ICON = {
  success: <CheckIcon />,
  error: <CrossIcon />,
  info: <InfoIcon />,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = nextIdRef.current++;
    setItems((prev) => [...prev.slice(-2), { id, kind, text }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo<ToastApi>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            <span className="toast__glyph" aria-hidden="true">
              {KIND_ICON[t.kind]}
            </span>
            <span className="toast__text">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
