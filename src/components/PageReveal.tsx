import { useCallback, type ReactNode } from 'react';
import { usePageRouter } from '../router/context';
import { PageRevealContext } from './page-reveal-context';

/**
 * Click-triggered navigation seam (infrastructure only).
 *
 * Any click-driven component calls `startReveal(pageId, x, y)` and the
 * provider performs the navigation. The click coordinates are part of the
 * API so future click effects (ripples, wipes, …) can plug in here without
 * touching any call site.
 */
export function PageRevealProvider({ children }: { children: ReactNode }) {
  const { navigate } = usePageRouter();

  const startReveal = useCallback(
    (pageId: string, _x: number, _y: number) => {
      navigate(pageId);
    },
    [navigate],
  );

  return (
    <PageRevealContext.Provider value={startReveal}>
      {children}
    </PageRevealContext.Provider>
  );
}
