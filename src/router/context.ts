import { createContext, useContext } from 'react';

/** 首页内的滚动锚点（同一条 URL 下的历史位置标记） */
export type ScrollAnchor = 'top' | 'notes';

export type PageState = {
  pageId: string;
  scrollY: number;
  /** 仅同页滚动历史条目携带：返回/前进到该条目时滚到对应锚点 */
  scrollAnchor?: ScrollAnchor;
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
  /**
   * 在不更换页面/URL 的前提下压入一条滚动锚点历史条目（如搜索后跳到结果区）。
   * 浏览器返回键即可平滑回到上一屏；连续触发时替换已有锚点条目，避免刷屏历史栈。
   */
  pushScrollAnchor: (anchor: ScrollAnchor) => void;
};

export const PageRouterContext = createContext<RouterValue | null>(null);

export function usePageRouter(): RouterValue {
  const ctx = useContext(PageRouterContext);
  if (!ctx) throw new Error('usePageRouter must be used within PageRouterProvider');
  return ctx;
}
