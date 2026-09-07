import type { MouseEvent } from 'react';
import { useGoBack, usePageReveal } from './page-reveal-context';
import './BackLink.css';

/**
 * 子页面的返回控件：
 * - 默认优先浏览器历史（保留滚动位置），无历史则回 fallback；
 * - 传 `to` 时直接导航到指定页面，而不是返回上一页。
 */
export default function BackLink({
  fallback = 'home',
  to,
}: {
  fallback?: string;
  to?: string;
}) {
  const goBack = useGoBack(fallback);
  const startReveal = usePageReveal();

  const handleClick = to
    ? (e: MouseEvent<HTMLButtonElement>) => startReveal(to, e.clientX, e.clientY)
    : goBack;

  return (
    <button type="button" className="back-link" onClick={handleClick}>
      ← 返回
    </button>
  );
}
