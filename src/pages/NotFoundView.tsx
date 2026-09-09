import { type MouseEvent } from 'react';
import Button from '../components/Button';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import './NotFoundView.css';

export default function NotFoundView({ pageId }: { pageId: string }) {
  const startReveal = usePageReveal();

  const goHome = (e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    // startReveal 内部即 navigate('home')，会把地址栏规范回 '/'
    startReveal('home', e.clientX, e.clientY);
  };

  const shown =
    pageId === 'not-found'
      ? window.location.pathname + window.location.search
      : pageId;

  return (
    <div className="notfound">
      <h1 className="notfound__code">404</h1>
      <p className="notfound__msg">
        未知页面：<code>{shown}</code>
      </p>
      <Button variant="solid" onClick={goHome}>
        ← 回到首页
      </Button>
    </div>
  );
}
