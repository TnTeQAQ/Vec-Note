import { useEffect } from 'react';
import { PageRouterProvider } from './router/router';
import { usePageRouter } from './router/context';
import { getPageTitle, renderPage } from './router/pages';
import { PageRevealProvider } from './components/PageReveal';
import AdminProvider from './components/AdminProvider';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeToggle from './components/ThemeToggle';
import ScrollTopButton from './components/ScrollTopButton';
import AdminFab from './components/AdminFab';

function ViewOutlet() {
  const { page } = usePageRouter();
  return (
    <main className="app-main" key={page.pageId}>
      {renderPage(page.pageId)}
    </main>
  );
}

/** 页面视图的兜底边界：渲染异常弹 toast + 可重试面板，避免整站白屏 */
function PageViewBoundary() {
  const { toast } = useToast();
  return (
    <ErrorBoundary onError={(m) => toast(`页面出错：${m}`, 'error')}>
      <ViewOutlet />
    </ErrorBoundary>
  );
}

function Shell() {
  const { page } = usePageRouter();

  useEffect(() => {
    document.title = `${getPageTitle(page.pageId)} · Vec-Note`;
  }, [page]);

  return (
    <PageRevealProvider>
      <PageViewBoundary />
      <div className="theme-fab">
        <ScrollTopButton />
        <AdminFab />
        <ThemeToggle />
      </div>
    </PageRevealProvider>
  );
}

export default function App() {
  return (
    <PageRouterProvider>
      <ToastProvider>
        <AdminProvider>
          <Shell />
        </AdminProvider>
      </ToastProvider>
    </PageRouterProvider>
  );
}
