import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { listNotes, type Note } from '../lib/api';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteCard from '../components/NoteCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './HomeView.css';

/**
 * 论坛式主页，双屏结构：
 * - 第一屏（100svh 居中）：搜索框 + 发布入口；
 * - 第二屏：留言流（按时间排序）。
 * 滚轮一档在两屏之间平滑滑动（参考 blog_site 首页），搜索提交后自动滑到结果。
 */
export default function HomeView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const startReveal = usePageReveal();
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLElement>(null);

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

    // 滚轮：搜索屏 ↔ 留言屏。
  // 只在「停顿后重新开始的手势」里滑屏；滑动中同向滚动立即取消滑屏交给原生，
  // 连续向下滚动不吞输入、不停顿；反方向滚动则从当前位置立刻反向，来回丝滑。
  useEffect(() => {
    if (reduced) return; // 减弱动效：交给原生滚动

    let raf = 0;
    let active = false;
    let from = 0;
    let to = 0;
    let t0 = 0;
    let lastWheel = 0; // 上一个滚轮事件的时刻（0 = 从未滚过）
    const DURATION = 360;

    const boardTop = () => {
      const el = boardRef.current;
      return el ? el.getBoundingClientRect().top + window.scrollY - 20 : window.innerHeight - 20;
    };

    const cancel = () => {
      cancelAnimationFrame(raf);
      active = false;
    };

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic：起步快，不显停顿
      window.scrollTo(0, from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(step);
      else active = false;
    };

    const glide = (next: number) => {
      from = window.scrollY;
      to = next;
      t0 = performance.now();
      cancel();
      active = true;
      raf = requestAnimationFrame(step);
    };

    const onWheel = (event: WheelEvent) => {
      const now = performance.now();
      const idle = now - lastWheel; // 距上一个滚轮事件的间隔
      lastWheel = now;

      const y = window.scrollY;
      const vh = window.innerHeight;
      const atSearch = y < vh * 0.5;
      const down = event.deltaY > 0;

      if (active) {
        if (down === to > from) {
          // 同向持续滚动：取消滑屏、不拦截本档 → 原生无缝续滚，输入不吞
          cancel();
          return;
        }
        // 反向滚动：从当前位置立刻反向
        event.preventDefault();
        glide(down ? boardTop() : 0);
        return;
      }

      // 仅「停顿 500ms 后的新手势」才滑屏；连续滚动交给原生，绝不卡顿
      if (idle < 500) return;
      if (down && atSearch) {
        event.preventDefault();
        glide(boardTop());
      } else if (!down && !atSearch && y < vh * 1.3) {
        event.preventDefault();
        glide(0);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const goBoard = (e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    startReveal('board', e.clientX, e.clientY);
  };

  const handleResults = (o: SearchOutcome | null) => {
    setOutcome(o);
    if (o) {
      // 提交搜索后直接滑到结果区
      requestAnimationFrame(() => {
        const el = boardRef.current;
        if (!el) return;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 20,
          behavior: reduced ? 'auto' : 'smooth',
        });
      });
    }
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
