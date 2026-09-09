import type { ReactNode } from 'react';
import HomeView from '../pages/HomeView';
import AboutView from '../pages/AboutView';
import NotFoundView from '../pages/NotFoundView';

/**
 * Single-root page registry. Views are keyed by pageId:
 * - `home`       论坛主页：搜索 + 留言流；发布留言用弹窗表单，不占路由
 * - `about`      关于：密码学说明（真实路径 /about，可被搜索引擎收录）
 * - `not-found`  未知路径的 404 视图（服务端同时返回 HTTP 404）
 * 解密核查走弹窗（VerifyModal），不占路由。
 */
export function renderPage(pageId: string): ReactNode {
  if (pageId === 'home') return <HomeView />;
  if (pageId === 'about') return <AboutView />;
  return <NotFoundView pageId={pageId} />;
}
