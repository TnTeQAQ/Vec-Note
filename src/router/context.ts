import { createContext, useContext } from 'react';

export type PageState = {
  pageId: string;
  scrollY: number;
};

export type NavigateOptions = {
  /** replace the current history entry instead of pushing a new one */
  replace?: boolean;
  /** explicit scroll target; defaults to 0 (top) */
  scrollTo?: number;
};

export type RouterValue = {
  page: PageState;
  navigate: (pageId: string, opts?: NavigateOptions) => void;
};

export const PageRouterContext = createContext<RouterValue | null>(null);

export function usePageRouter(): RouterValue {
  const ctx = useContext(PageRouterContext);
  if (!ctx) throw new Error('usePageRouter must be used within PageRouterProvider');
  return ctx;
}
