import { createContext, useContext } from 'react';

export type StartReveal = (pageId: string, x: number, y: number) => void;

export const PageRevealContext = createContext<StartReveal>(() => {});

export function usePageReveal(): StartReveal {
  return useContext(PageRevealContext);
}

export function isPlainClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}) {
  return (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  );
}

/**
 * Back navigation: browser history when available, otherwise navigate to the
 * fallback page. Shared by content pages and lists.
 */
export function useGoBack(fallback: string = 'home'): () => void {
  const startReveal = usePageReveal();
  return () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      startReveal(fallback, window.innerWidth / 2, window.innerHeight / 2);
    }
  };
}
