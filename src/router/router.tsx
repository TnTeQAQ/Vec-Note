import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PageRouterContext, type PageState, type NavigateOptions, type ScrollAnchor } from './context';
import { pageIdFromPath, pathFromPageId } from './routes';

const STATE_KEY = 'vecNotePage';

/**
 * Single-root router with real history support.
 *
 * Pages live at real paths — home is always the clean `/`, about is `/about`
 * (shareable, indexable) — while in-app navigation keeps the single-root
 * experience. Browser back/forward (including mouse side buttons) fire
 * `popstate` and restore the page + scroll. In addition to page navigation,
 * same-page scroll positions (e.g. jumping to search results) can be pushed
 * as lightweight history entries so the browser back button moves between
 * screens of the same page instead of leaving the site.
 */
type HistoryEntryState = {
  [STATE_KEY]: PageState;
};

function pageFromPathname(pathname: string): PageState {
  return { pageId: pageIdFromPath(pathname), scrollY: 0 };
}

function readEntryState(state: HistoryEntryState | null | undefined): PageState | null {
  const entry = state?.[STATE_KEY];
  if (entry && typeof entry.pageId === 'string') {
    return {
      pageId: entry.pageId as PageState['pageId'],
      scrollY: typeof entry.scrollY === 'number' ? entry.scrollY : 0,
      scrollAnchor: entry.scrollAnchor,
    };
  }
  return null;
}

function boot(): PageState {
  const params = new URLSearchParams(window.location.search);
  // deep link: ?target=<pageId> takes precedence, then we replace the URL
  // with the page's canonical path so the address bar ends up clean
  const target = params.get('target');
  if (target) {
    const known = target === 'about' ? 'about' : 'home';
    history.replaceState(
      { [STATE_KEY]: { pageId: known, scrollY: 0 } },
      '',
      pathFromPageId(known) ?? '/',
    );
    return { pageId: known, scrollY: 0 };
  }
  return pageFromPathname(window.location.pathname);
}

function restoreScroll(scrollY: number) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  });
}

function smoothScrollToY(y: number) {
  requestAnimationFrame(() => {
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
}

type AnchorRequest = { anchor: ScrollAnchor; n: number };

export function PageRouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageState>(boot);
  // 待执行的同页锚点滚动（带序号：即使目标相同，连续搜索也会重新触发滚动）
  const [anchorReq, setAnchorReq] = useState<AnchorRequest | null>(null);
  const anchorSeq = useRef(0);
  const requestAnchor = useCallback((anchor: ScrollAnchor) => {
    anchorSeq.current += 1;
    setAnchorReq({ anchor, n: anchorSeq.current });
  }, []);

  const navigate = useCallback((pageId: string, opts?: NavigateOptions) => {
    const scrollY = opts?.scrollTo ?? 0;
    const next: PageState = { pageId: pageId as PageState['pageId'], scrollY };
    setPage(next);
    setAnchorReq(null);
    const entry: HistoryEntryState = { [STATE_KEY]: next };
    const url = pathFromPageId(pageId) ?? window.location.pathname;
    if (opts?.replace) {
      history.replaceState(entry, '', url);
    } else {
      history.pushState(entry, '', url);
    }
    restoreScroll(scrollY);
  }, []);

  // 压入一条同页滚动锚点历史。若当前条目已经是同页锚点，则替换它，
  // 使连续搜索只产生一条锚点记录，不刷屏浏览器历史栈。
  const pushScrollAnchor = useCallback(
    (anchor: ScrollAnchor) => {
      const base: PageState = { pageId: page.pageId, scrollY: window.scrollY };
      const current = readEntryState(history.state as HistoryEntryState | null);
      const nextState: PageState = { ...base, scrollAnchor: anchor };
      const entry: HistoryEntryState = { [STATE_KEY]: nextState };
      const url = window.location.pathname + window.location.search;
      if (current?.scrollAnchor) {
        history.replaceState(entry, '', url);
      } else {
        history.pushState(entry, '', url);
      }
      requestAnchor(anchor);
    },
    [page.pageId, requestAnchor],
  );

  // 当前页面 id 的实时引用，供 popstate 判断「同页内返回」还是「跨页返回」
  const currentPageIdRef = useRef(page.pageId);
  currentPageIdRef.current = page.pageId;

  // back / forward (including mouse side buttons)
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const entry = readEntryState(event.state as HistoryEntryState | null);
      if (entry) {
        const samePage = entry.pageId === currentPageIdRef.current;
        setPage({ pageId: entry.pageId, scrollY: entry.scrollY, scrollAnchor: entry.scrollAnchor });
        if (entry.scrollAnchor) {
          // 锚点条目（无论同页/跨页）：驱动到 #top / #notes
          requestAnchor(entry.scrollAnchor);
        } else if (samePage) {
          // 同页内从锚点条目返回：平滑滚回（通常是顶部搜索区）
          setAnchorReq(null);
          smoothScrollToY(entry.scrollY || 0);
        } else {
          setAnchorReq(null);
          restoreScroll(entry.scrollY || 0);
        }
      } else {
        const restored = pageFromPathname(window.location.pathname);
        setPage(restored);
        setAnchorReq(null);
        restoreScroll(0);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [requestAnchor]);

  // seed the current history entry with boot state and restore scroll.
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    const current = readEntryState(history.state as HistoryEntryState | null);
    if (
      !current ||
      current.pageId !== page.pageId ||
      current.scrollY !== page.scrollY ||
      current.scrollAnchor !== page.scrollAnchor
    ) {
      const entry: HistoryEntryState = { [STATE_KEY]: page };
      history.replaceState(entry, '', window.location.pathname + window.location.search);
    }
    restoreScroll(page.scrollY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ page, navigate, pushScrollAnchor }),
    [page, navigate, pushScrollAnchor],
  );

  return (
    <PageRouterContext.Provider value={value}>
      <AnchorScrollDriver req={anchorReq} />
      {children}
    </PageRouterContext.Provider>
  );
}

/**
 * 把待处理的同页锚点解析为实际的平滑滚动。放在 Provider 内、页面外层，
 * 依据 id 查找元素（#top / #notes）；找不到时退回固定位置。序号 n 变化即触发。
 */
function AnchorScrollDriver({ req }: { req: AnchorRequest | null }) {
  useEffect(() => {
    if (!req) return;
    const { anchor } = req;
    const el = document.getElementById(anchor === 'notes' ? 'notes' : 'top');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      smoothScrollToY(anchor === 'notes' ? window.innerHeight : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.n]);
  return null;
}
