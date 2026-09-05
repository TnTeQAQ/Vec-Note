import type { ReactNode } from 'react';
import HomeView from '../pages/HomeView';
import BoardView from '../pages/BoardView';
import SearchView from '../pages/SearchView';
import LabView from '../pages/LabView';
import AboutView from '../pages/AboutView';
import NotFoundView from '../pages/NotFoundView';

/**
 * Single-root page registry. Views are keyed by pageId (not URL paths):
 * - `home`    首页：hero + 最新留言 + 特性
 * - `board`   留言板：发布 + 最近留言
 * - `search`  搜索：向量召回 + 前端验签
 * - `lab`     实验台：手动解密核查 + 对照示例
 * - `about`   关于：密码学说明
 */
export function renderPage(pageId: string): ReactNode {
  if (pageId === 'home') return <HomeView />;
  if (pageId === 'board') return <BoardView />;
  if (pageId === 'search') return <SearchView />;
  if (pageId === 'lab') return <LabView />;
  if (pageId === 'about') return <AboutView />;
  return <NotFoundView pageId={pageId} />;
}

export function getPageTitle(pageId: string): string {
  if (pageId === 'home') return '首页';
  if (pageId === 'board') return '留言板';
  if (pageId === 'search') return '搜索';
  if (pageId === 'lab') return '解密实验台';
  if (pageId === 'about') return '关于';
  return 'Not Found';
}
