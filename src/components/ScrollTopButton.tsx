import { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * 回到顶部：滚动超过一屏后显示在右下角（与主题切换同组同款样式）。
 */
export default function ScrollTopButton() {
  const [past, setPast] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!past) return null;

  return (
    <button
      type="button"
      className="fab-round"
      onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
      title="回到顶部"
      aria-label="回到顶部"
    >
      ↑
    </button>
  );
}
