import type { ReactNode } from 'react';
import { type MouseEvent } from 'react';
import { isPlainClick, usePageReveal } from './page-reveal-context';
import './SectionHead.css';

/**
 * Section heading row: bold uppercase title on the left, an optional
 * `View all →` style link on the right that navigates to `target`.
 */
export default function SectionHead({
  title,
  target,
  actionLabel = 'View all →',
}: {
  title: string;
  target?: string;
  actionLabel?: string;
}) {
  const startReveal = usePageReveal();

  const go = (e: MouseEvent<HTMLButtonElement>) => {
    if (!target) return;
    if (!isPlainClick(e)) return;
    startReveal(target, e.clientX, e.clientY);
  };

  return (
    <div className="section-head">
      <h2 className="section-head__title">{title}</h2>
      {target ? (
        <button type="button" className="section-head__action" onClick={go}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export type SectionHeadTitleProps = { children: ReactNode };
