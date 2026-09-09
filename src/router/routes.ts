// pageId ↔ URL 路径映射（纯函数，客户端路由与 Worker/测试共用）。
// 设计约束：首页地址栏始终为干净的 '/'；关于页有独立可分享/可收录的 '/about'。
// 未知路径映射为保留 id 'not-found'，由页面层渲染 404 UI。

export const KNOWN_PAGES = ['home', 'about'] as const;
export type KnownPageId = (typeof KNOWN_PAGES)[number];

/** 路由层使用的页面 id；'not-found' 仅在路径无法识别时出现 */
export type RoutePageId = KnownPageId | 'not-found';

const PATH_BY_PAGE: Record<KnownPageId, string> = {
  home: '/',
  about: '/about',
};

const PAGE_BY_PATH: Record<string, KnownPageId> = {
  '/': 'home',
  '/about': 'about',
};

/** pageId → 规范路径；未知 id 返回 null */
export function pathFromPageId(pageId: string): string | null {
  return (PATH_BY_PAGE as Record<string, string>)[pageId] ?? null;
}

/** 路径 → pageId；未知路径返回 'not-found'（永不抛错） */
export function pageIdFromPath(pathname: string): RoutePageId {
  // 去掉尾部斜杠（但保留根 '/'），让 '/about/' 也能命中
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.replace(/\/+$/, '')
      : pathname;
  return (PAGE_BY_PATH as Record<string, KnownPageId>)[normalized] ?? 'not-found';
}
