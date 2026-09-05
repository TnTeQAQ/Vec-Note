import { useRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import './Button.css';

type Variant = 'solid' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  /** show a ripple at the click position */
  ripple?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Brutalist button: hard border, inverted hover, press-down scale and a
 * click ripple. Press motion runs on CSS transitions; the ripple is spawned
 * as a transient span animated by CSS keyframes (no animation library).
 */
export default function Button({
  variant = 'solid',
  size = 'md',
  ripple = true,
  className = '',
  children,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onClick,
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const press = (down: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--btn-scale', down ? '0.95' : '1');
  };

  const spawnRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || !ripple) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'btn-ripple';
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  };

  const classes = ['btn', `btn--${variant}`, `btn--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      onPointerDown={(e) => {
        press(true);
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        press(false);
        onPointerUp?.(e);
      }}
      onPointerLeave={(e) => {
        press(false);
        onPointerLeave?.(e);
      }}
      onClick={(e) => {
        spawnRipple(e);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
