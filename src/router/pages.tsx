import type { ReactNode } from 'react';
import HomeView from '../pages/HomeView';
import BoardView from '../pages/BoardView';
import LabView from '../pages/LabView';
import AboutView from '../pages/AboutView';
import NotFoundView from '../pages/NotFoundView';

/**
 * Single-root page registry. Views are keyed by pageId (not URL paths):
 * - `home`  论坛主页：搜索 + 留言流（按密文分组折叠）
 * - `board` 发布留言表单
 * - `lab`   解密实验台：手动核查
 * - `about` 关于：密码学说明
 */
export function renderPage(pageId: string): ReactNode {
  if (pageId === 'home') return <HomeView />;
  if (pageId === 'board') return <BoardView />;
  if (pageId === 'lab') return <LabView />;
  if (pageId === 'about') return <AboutView />;
  return <NotFoundView pageId={pageId} />;
}

export function getPageTitle(pageId: string): string {
  if (pageId === 'home') return '首页';
  if (pageId === 'board') return '发布留言';
  if (pageId === 'lab') return '解密实验台';
  if (pageId === 'about') return '关于';
  return 'Not Found';
}
