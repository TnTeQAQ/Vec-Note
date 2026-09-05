import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageRouterContext, type PageState, type NavigateOptions } from './context';

const LS_KEY = 'vec-note:page';
const STATE_KEY = 'vecNotePage';

/**
 * Single-root router with real history support but a clean URL.
 *
 * Every navigation calls history.pushState with the page state embedded in
 * the history entry's `state` object while keeping the URL identical, so the
 * address bar never changes. Browser back/forward (including mouse side
 * buttons) fire `popstate` and restore the corresponding page + scroll.
 * Refresh restores from history.state (persisted per entry), with
 * localStorage as a fallback. Link sharing still just shares the root URL.
 */
type HistoryState = { [STATE_KEY]: PageState };

function readHistoryState(): PageState | null {
  const entry = (history.state as HistoryState | null)?.[STATE_KEY];
  if (entry && typeof entry.pageId === 'string') {
    return {
      pageId: entry.pageId,
      scrollY: typeof entry.scrollY === 'number' ? entry.scrollY : 0,
    };
  }
  return null;
}

function readLocalState(): PageState | null {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<PageState>;
      if (parsed && typeof parsed.pageId === 'string') {
        return {
          pageId: parsed.pageId,
          scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : 0,
        };
      }
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

function boot(): PageState {
  // deep link: ?target=<pageId> takes precedence over any stored state, then
  // the param is stripped from the URL so the address bar stays clean
  const params = new URLSearchParams(window.location.search);
  const target = params.get('target');
  if (target) {
    params.delete('target');
    const qs = params.toString();
    const clean = window.location.pathname + (qs ? `?${qs}` : '');
    history.replaceState(history.state, '', clean);
    return { pageId: target, scrollY: 0 };
  }
  // clean up any stale hash left by previous routing
  if (window.location.hash) {
    history.replaceState(
      history.state,
      '',
      window.location.pathname + window.location.search,
    );
  }
  return readHistoryState() ?? readLocalState() ?? { pageId: 'home', scrollY: 0 };
}

function restoreScroll(scrollY: number) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  });
}

export function PageRouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageState>(boot);

  const navigate = useCallback((pageId: string, opts?: NavigateOptions) => {
    const scrollY = opts?.scrollTo ?? 0;
    const next: PageState = { pageId, scrollY };
    setPage(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    const entry: HistoryState = { [STATE_KEY]: next };
    if (opts?.replace) {
      history.replaceState(entry, '', window.location.href);
    } else {
      history.pushState(entry, '', window.location.href);
    }
    restoreScroll(scrollY);
  }, []);

  // back / forward (including mouse side buttons)
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const entry = (event.state as HistoryState | null)?.[STATE_KEY];
      if (!entry || typeof entry.pageId !== 'string') {
        // foreign entry (e.g. arrived from another site) — fall back
        setPage(readLocalState() ?? { pageId: 'home', scrollY: 0 });
        restoreScroll(0);
        return;
      }
      setPage({ pageId: entry.pageId, scrollY: entry.scrollY || 0 });
      restoreScroll(entry.scrollY || 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // seed the current history entry with the boot state and restore scroll
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    const clean = window.location.pathname + window.location.search;
    const current = readHistoryState();
    if (!current || current.pageId !== page.pageId || current.scrollY !== page.scrollY) {
      const entry: HistoryState = { [STATE_KEY]: page };
      history.replaceState(entry, '', clean);
    } else if (window.location.hash) {
      history.replaceState(history.state, '', clean);
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(page));
    } catch {
      /* storage unavailable */
    }
    restoreScroll(page.scrollY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ page, navigate }), [page, navigate]);

  return (
    <PageRouterContext.Provider value={value}>{children}</PageRouterContext.Provider>
  );
}
