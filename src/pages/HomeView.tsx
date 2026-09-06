import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import Lenis from 'lenis';
import type { EasingFunction } from 'lenis';
import { listNotes, searchNotes, type Note } from '../lib/api';
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
/** 每页条数 */
const PAGE_SIZE = 20;

/**
 * 论坛式主页，双屏结构：
 * - 第一屏（100svh 居中）：搜索框 + 发布入口（弹窗表单）；
 * - 第二屏：最新留言流（按时间排序）或搜索结果——两者都支持
 *   向下滚动动态加载下一页（react-intersection-observer 哨兵）。
 */
export default function HomeView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchOutcome | null>(null);
  const [composing, setComposing] = useState(false);
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const offsetRef = useRef(0); // 留言流已加载条数（下一页的 offset）

  const load = useCallback(async () => {
    try {
      const { notes, hasMore } = await listNotes(PAGE_SIZE, 0);
      offsetRef.current = notes.length;
      setNotes(notes);
      setHasMore(hasMore);
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

  // 无限滚动：哨兵进入视口（提前 600px）→ 加载当前列表的下一页。
  // 搜索结果与留言流互斥出现，共用一个哨兵；搜索复用同一查询向量翻页，
  // 保证排序一致、无重复/跳漏。
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (search) {
      if (!search.hasMore) return;
      setLoadingMore(true);
      try {
        const page = await searchNotes(search.vector, search.results.length, PAGE_SIZE);
        setSearch((prev) =>
          prev && prev.query === search.query
            ? {
                ...prev,
                results: [...prev.results, ...page.results],
                total: page.total,
                hasMore: page.hasMore,
              }
            : prev,
        );
      } catch {
        // 静默，继续滚动会重试
      } finally {
        setLoadingMore(false);
      }
    } else {
      if (!hasMore) return;
      setLoadingMore(true);
      try {
        const page = await listNotes(PAGE_SIZE, offsetRef.current);
        offsetRef.current += page.notes.length;
        setNotes((prev) => [...prev, ...page.notes]);
        setHasMore(page.hasMore);
      } catch {
        // 静默，继续滚动会重试
      } finally {
        setLoadingMore(false);
      }
    }
    // 页面变长后刷新 Lenis 可滚动上限
    lenisRef.current?.resize();
  }, [loadingMore, search, hasMore]);

  const { ref: sentinelRef, inView: sentinelInView } = useInView({
    rootMargin: '600px 0px',
  });

  useEffect(() => {
    if (!sentinelInView || loadingMore) return;
    const more = search ? search.hasMore : hasMore;
    if (more) void loadMore();
  }, [sentinelInView, loadingMore, search, hasMore, loadMore]);

  // 滑到「最新留言」区顶部（着陆点留 20px 余量）
  const glideToBoard = useCallback(() => {
    requestAnimationFrame(() => {
      const el = boardRef.current;
      if (!el) return;
      const lenis = lenisRef.current;
      // 结果/留言会改变页面高度；先让 Lenis 重算可滚动上限，
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
      // 弹窗（详情/发布）内的滚动交给其自身容器，不触发翻屏
      const target = event.target as Element | null;
      if (target && typeof target.closest === 'function' && target.closest('.modal')) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const down = event.deltaY > 0;
      if (down && y < vh * 0.5) {
        // 搜索屏下滑 → 滑到「最新留言」/搜索结果
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
    setSearch(o);
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

  // 列表底部哨兵：滚动接近底部时加载下一页
  const sentinel = (
    <div ref={sentinelRef} className="home__more">
      {loadingMore ? <span className="home__more-text">加载中…</span> : null}
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
        {search ? (
          <>
            <p className="home__query">
              「{search.query}」 · {search.total} 条候选
              {search.total > 0 && (
                <button type="button" className="home__clear" onClick={() => setSearch(null)}>
                  清除
                </button>
              )}
            </p>
            {search.total === 0 ? (
              <p className="home__empty">未找到匹配项。</p>
            ) : (
              <>
                {cards(search.results)}
                {sentinel}
              </>
            )}
          </>
        ) : (
          <>
            <Reveal>
              <h2 className="home__board-title">最新留言</h2>
            </Reveal>
            {loading ? (
              <p className="home__empty">加载中…</p>
            ) : error ? (
              <p className="home__error">加载失败：{error}</p>
            ) : notes.length === 0 ? (
              <p className="home__empty">暂无留言，点「发布留言」写下第一条吧。</p>
            ) : (
              <>
                {cards(notes)}
                {sentinel}
              </>
            )}
          </>
        )}
      </section>

      <Modal open={composing} title="发布留言" onClose={() => setComposing(false)}>
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
