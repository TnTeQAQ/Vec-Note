import type { ReactNode } from 'react';
import HomeView from '../pages/HomeView';
import AboutView from '../pages/AboutView';
import NotFoundView from '../pages/NotFoundView';

/**
 * Single-root page registry. Views are keyed by pageId (not URL paths):
 * - `home`  论坛主页：搜索 + 留言流；发布留言用弹窗表单，不占路由
 * - `about` 关于：密码学说明
 * 解密核查走弹窗（VerifyModal），不占路由。
 */
export function renderPage(pageId: string): ReactNode {
  if (pageId === 'home') return <HomeView />;
  if (pageId === 'about') return <AboutView />;
  return <NotFoundView pageId={pageId} />;
}

export function getPageTitle(pageId: string): string {
  if (pageId === 'home') return '首页';
  if (pageId === 'about') return '关于';
  return 'Not Found';
}
