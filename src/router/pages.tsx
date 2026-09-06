import type { ReactNode } from 'react';
import HomeView from '../pages/HomeView';
import LabView from '../pages/LabView';
import AboutView from '../pages/AboutView';
import NotFoundView from '../pages/NotFoundView';

/**
 * Single-root page registry. Views are keyed by pageId (not URL paths):
 * - `home`  论坛主页：搜索 + 留言流；发布留言用弹窗表单，不占路由
 * - `lab`   解密实验台：手动核查
 * - `about` 关于：密码学说明
 */
export function renderPage(pageId: string): ReactNode {
  if (pageId === 'home') return <HomeView />;
  if (pageId === 'lab') return <LabView />;
  if (pageId === 'about') return <AboutView />;
  return <NotFoundView pageId={pageId} />;
}

export function getPageTitle(pageId: string): string {
  if (pageId === 'home') return '首页';
  if (pageId === 'lab') return '解密实验台';
  if (pageId === 'about') return '关于';
  return 'Not Found';
}
