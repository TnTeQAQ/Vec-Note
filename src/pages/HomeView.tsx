import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Lenis from 'lenis';
import type { EasingFunction } from 'lenis';
import { listNotes, type Note } from '../lib/api';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteCard from '../components/NoteCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './HomeView.css';

const easeOut: EasingFunction = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 论坛式主页，双屏结构：
 * - 第一屏（100svh 居中）：搜索框 + 发布入口；
 * - 第二屏：最新留言流（按时间排序）。
 * 滚轮翻屏由 Lenis + Snap('lock') 库驱动，不手写动画。
 */
export default function HomeView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const startReveal = usePageReveal();
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    let alive = true;
    listNotes(20)
      .then(({ notes }) => {
        if (alive) {
          setNotes(notes);
          setError(null);
        }
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 滚轮翻屏：Lenis 负责全页平滑滚动与翻屏动画（不手写任何动画）；
  // 这里只做「翻屏意图」判定，动画委托 lenis.scrollTo——
  // 无 debounce、无锁定，每一次滚轮都立即响应，来回可无限次平滑切换。
  useEffect(() => {
    if (reduced) return; // 减弱动效：完全原生滚动
    const lenis = new Lenis({ autoRaf: true });
    lenisRef.current = lenis;

    const onWheel = (event: WheelEvent) => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const down = event.deltaY > 0;
      if (down && y < vh * 0.5) {
        // 搜索屏下滑 → 滑到「最新留言」
        const el = boardRef.current;
        const top = el ? el.getBoundingClientRect().top + y : vh;
        lenis.scrollTo(top, { duration: 0.8, easing: easeOut });
      } else if (!down && y > vh * 0.5 && y < vh * 1.4) {
        // 留言区顶部上滑 → 回搜索屏
        lenis.scrollTo(0, { duration: 0.8, easing: easeOut });
      }
      // 其余位置：交给 lenis 原生平滑滚动
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [reduced]);

  const goBoard = (e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    startReveal('board', e.clientX, e.clientY);
  };

  const handleResults = (o: SearchOutcome | null) => {
    setOutcome(o);
    if (!o) return;
    // 提交搜索后直接滑到结果区
    requestAnimationFrame(() => {
      const el = boardRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 20;
      if (lenisRef.current) {
        lenisRef.current.scrollTo(top, { duration: 0.8, easing: easeOut });
      } else {
        window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  };

  const cards = (list: Note[]) => (
    <div className="home__cards">
      {list.map((note, index) => (
        <Reveal key={note.id} delay={Math.min(index, 6) * 24}>
          <NoteCard note={note} verify />
        </Reveal>
      ))}
    </div>
  );

  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__hero-inner">
          <Reveal>
            <h1 className="home__title">Vec-Note</h1>
          </Reveal>
          <Reveal delay={80} className="home__search">
            <SearchForm onResults={handleResults} />
          </Reveal>
          <Reveal delay={140}>
            <Button variant="solid" size="md" onClick={goBoard}>
              发布留言 →
            </Button>
          </Reveal>
        </div>
        <span className="home__scroll-hint" aria-hidden="true">
          ↓
        </span>
      </section>

      <section className="home__board" ref={boardRef}>
        {!outcome && (
          <Reveal>
            <h2 className="home__board-title">最新留言</h2>
          </Reveal>
        )}
        {outcome ? (
          <>
            <p className="home__query">
              「{outcome.query}」 · {outcome.results.length} 条候选
              {outcome.results.length > 0 && (
                <button type="button" className="home__clear" onClick={() => setOutcome(null)}>
                  清除
                </button>
              )}
            </p>
            {outcome.results.length === 0 ? (
              <p className="home__empty">未找到匹配项。</p>
            ) : (
              cards(outcome.results)
            )}
          </>
        ) : loading ? (
          <p className="home__empty">加载中…</p>
        ) : error ? (
          <p className="home__error">加载失败：{error}</p>
        ) : notes.length === 0 ? (
          <p className="home__empty">暂无留言，点「发布留言」写下第一条吧。</p>
        ) : (
          cards(notes)
        )}
      </section>
    </div>
  );
}
