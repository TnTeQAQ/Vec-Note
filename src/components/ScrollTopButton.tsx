import { useEffect, useState } from 'react';

/**
 * 回到顶部：滚动超过一屏后显示在右下角（与主题切换同组同款样式）。
 * 始终平滑滚动——回顶是导航交互，不被 prefers-reduced-motion 降级为瞬切。
 */
export default function ScrollTopButton() {
  const [past, setPast] = useState(false);

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
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="回到顶部"
      aria-label="回到顶部"
    >
      <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M512 212.423111L0 724.437333l38.698667 38.712889L512 289.848889l473.301333 473.301333L1024 724.437333z" />
      </svg>
    </button>
  );
}
