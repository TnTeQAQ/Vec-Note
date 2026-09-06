import { useGoBack } from './page-reveal-context';
import './BackLink.css';

/** 子页面的返回控件：优先浏览器历史（保留滚动位置），无历史则回 fallback。 */
export default function BackLink({ fallback = 'home' }: { fallback?: string }) {
  const goBack = useGoBack(fallback);
  return (
    <button type="button" className="back-link" onClick={goBack}>
      ← 返回
    </button>
  );
}
