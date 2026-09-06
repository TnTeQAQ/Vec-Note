import { type MouseEvent } from 'react';
import { usePageRouter } from '../router/context';
import { isPlainClick, usePageReveal } from './page-reveal-context';
import './NavBar.css';

const LINKS: { pageId: string; label: string }[] = [
  { pageId: 'home', label: '首页' },
  { pageId: 'board', label: '留言' },
  { pageId: 'lab', label: '实验台' },
  { pageId: 'about', label: '关于' },
];

/** Top navigation: wordmark on the left, page links on the right. */
export default function NavBar() {
  const { page } = usePageRouter();
  const startReveal = usePageReveal();

  const go = (pageId: string, e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    startReveal(pageId, e.clientX, e.clientY);
  };

  return (
    <nav className="nav">
      <div className="nav__inner">
        <button
          type="button"
          className="nav__brand"
          onClick={(e) => go('home', e)}
          aria-label="回到首页"
        >
          Vec-Note
        </button>
        <div className="nav__links">
          {LINKS.map((link) => (
            <button
              key={link.pageId}
              type="button"
              className={`nav__link${page.pageId === link.pageId ? ' nav__link--active' : ''}`}
              onClick={(e) => go(link.pageId, e)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
