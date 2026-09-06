import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import type { EasingFunction } from 'lenis';
import { listNotes, type Note } from '../lib/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import NoteForm from '../components/NoteForm';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteCard from '../components/NoteCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './HomeView.css';

const easeOut: EasingFunction = (t: number) => 1 - Math.pow(1 - t, 3);
/** 翻屏动画时长（秒）：稍快但仍平滑 */
const GLIDE_SECONDS = 0.6;

/**
 * 论坛式主页，双屏结构：
 * - 第一屏（100svh 居中）：搜索框 + 发布入口（弹窗表单）；
 * - 第二屏：最新留言流（按时间排序）。
 * 滚轮翻屏由 Lenis 平滑驱动，发布留言不跳页、用弹窗完成。
 */
export default function HomeView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [composing, setComposing] = useState(false);
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const load = useCallback(async () => {
    try {
      const { notes } = await listNotes(20);
      setNotes(notes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 滑到「最新留言」区顶部（着陆点留 20px 余量）
  const glideToBoard = useCallback(() => {
    requestAnimationFrame(() => {
      const el = boardRef.current;
      if (!el) return;
      const lenis = lenisRef.current;
      // 搜索结果/新留言会改变页面高度；先让 Lenis 重算可滚动上限，
      // 否则 scrollTo 会把目标钳制在旧（短内容时的）上限，只滚半屏。
      lenis?.resize();
      const top = el.getBoundingClientRect().top + window.scrollY - 20;
      if (lenis) {
        lenis.scrollTo(top, { duration: GLIDE_SECONDS, easing: easeOut });
      } else {
        window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  }, [reduced]);

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
        lenis.scrollTo(top, { duration: GLIDE_SECONDS, easing: easeOut });
      } else if (!down && y > vh * 0.5 && y < vh * 1.4) {
        // 留言区顶部上滑 → 回搜索屏
        lenis.scrollTo(0, { duration: GLIDE_SECONDS, easing: easeOut });
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

  const handleResults = (o: SearchOutcome | null) => {
    setOutcome(o);
    if (!o) return;
    glideToBoard();
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
            <Button variant="solid" size="md" onClick={() => setComposing(true)}>
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

      <Modal
        open={composing}
        title="发布留言"
        onClose={() => setComposing(false)}
      >
        <NoteForm
          bare
          onCreated={() => {
            setComposing(false);
            void load();
            glideToBoard(); // 发完滑到留言区，看到刚发布的留言
          }}
        />
      </Modal>
    </div>
  );
}
