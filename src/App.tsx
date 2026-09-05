import { useEffect } from 'react';
import { PageRouterProvider } from './router/router';
import { usePageRouter } from './router/context';
import { getPageTitle, renderPage } from './router/pages';
import { PageRevealProvider } from './components/PageReveal';
import NavBar from './components/NavBar';
import ThemeToggle from './components/ThemeToggle';

function ViewOutlet() {
  const { page } = usePageRouter();
  return (
    <main className="app-main" key={page.pageId}>
      {renderPage(page.pageId)}
    </main>
  );
}

function Shell() {
  const { page } = usePageRouter();

  useEffect(() => {
    document.title = `${getPageTitle(page.pageId)} · Vec-Note`;
  }, [page]);

  return (
    <PageRevealProvider>
      <NavBar />
      <ViewOutlet />
      <div className="theme-fab">
        <ThemeToggle />
      </div>
    </PageRevealProvider>
  );
}

export default function App() {
  return (
    <PageRouterProvider>
      <Shell />
    </PageRouterProvider>
  );
}
