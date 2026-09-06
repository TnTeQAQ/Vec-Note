import { useRef, type ReactNode } from 'react';
import { useInView } from '../lib/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export type RevealProps = {
  children: ReactNode;
  /** stagger delay in ms */
  delay?: number;
  /** entrance duration in ms */
  duration?: number;
  /** entrance travel distance in px */
  y?: number;
  className?: string;
};

/**
 * Scroll-triggered entrance wrapper: fades + slides its content in once it
 * scrolls into view (IntersectionObserver + CSS transition — no animation
 * library). Renders instantly when reduced motion is requested. The hidden
 * state comes from the initial inline style, so there is no visible flash
 * before the entrance starts.
 */
export default function Reveal({
  children,
  delay = 0,
  duration = 360,
  y = 12,
  className = '',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const revealed = reduced || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : `translateY(${y}px)`,
        transition: reduced
          ? 'none'
          : `opacity ${duration}ms var(--ease-out) ${delay}ms, transform ${duration}ms var(--ease-out) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
