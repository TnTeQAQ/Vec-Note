import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { listNotes, searchNotes, type Note } from '../lib/api';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Button from '../components/Button';
import Modal from '../components/Modal';
import NoteForm from '../components/NoteForm';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteCard from '../components/NoteCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAdmin } from '../components/AdminProvider';
import { useToast } from '../components/Toast';
import './HomeView.css';

/** 每页条数 */
const PAGE_SIZE = 10;

/**
 * 论坛式主页，双屏结构（锚点导航，无自定义滚动逻辑）：
 * - 第一屏（#top）：搜索框 + 发布入口（弹窗表单）；
 * - 第二屏（#notes）：最新留言流 / 搜索结果。
 * 跳转用原生 # 锚点 + 浏览器平滑滚动；列表向下滚动时自动加载下一页。
 * 管理模式（登录后）：卡片显示删除入口，确认后从当前列表/搜索结果移除。
 */
export default function HomeView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchOutcome | null>(null);
  const [composing, setComposing] = useState(false);
  const { isAdmin, deleteNote } = useAdmin();
  const { toast } = useToast();

  // 删除确认
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const reduced = useReducedMotion();
  const startReveal = usePageReveal();
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

  // 原生锚点跳转（配合 html scroll-behavior: smooth）
  const scrollToId = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [reduced],
  );

  // 滚轮一屏切换（无状态意图判断，动画交给浏览器原生 smooth）：
  // 首页向下滚动 → 自动定位到评论区（#notes）；
  // 评论区顶部（0.5~1.5 屏高内）向上滚动 → 定位回搜索（#top）。
  // 更深处滚动不受影响（原生）；弹窗内滚动不触发。
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const t = e.target as Element | null;
      if (t && typeof t.closest === 'function' && t.closest('.modal')) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const down = e.deltaY > 0;
      if (down && y < vh * 0.5) {
        e.preventDefault();
        const el = document.getElementById('notes');
        if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      } else if (!down && y > vh * 0.5 && y < vh * 1.5) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [reduced]);

  // 无限滚动：哨兵进入视口（提前 600px）→ 加载当前列表的下一页。
  // 搜索结果与留言流互斥出现，共用一个哨兵；搜索复用同一查询向量翻页。
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
  }, [loadingMore, search, hasMore]);

  const { ref: sentinelRef, inView: sentinelInView } = useInView({
    rootMargin: '600px 0px',
  });

  useEffect(() => {
    if (!sentinelInView || loadingMore) return;
    const more = search ? search.hasMore : hasMore;
    if (more) void loadMore();
  }, [sentinelInView, loadingMore, search, hasMore, loadMore]);

  const handleResults = (o: SearchOutcome | null) => {
    setSearch(o);
    if (!o) return;
    // 结果渲染后平滑跳到留言/结果区
    requestAnimationFrame(() => scrollToId('notes'));
  };

  const handleCreated = () => {
    setComposing(false);
    void load();
    requestAnimationFrame(() => scrollToId('notes'));
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeleting(null);
  };

  /** 本地同步删除：列表过滤 + 偏移修正；搜索结果同步 total */
  const applyDeleteLocal = (id: string) => {
    const wasListed = notes.some((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (wasListed) offsetRef.current = Math.max(0, offsetRef.current - 1);
    setSearch((prev) => {
      if (!prev) return prev;
      const results = prev.results.filter((r) => r.id !== id);
      return prev.results.length === results.length
        ? prev
        : { ...prev, results, total: Math.max(0, prev.total - 1) };
    });
  };

  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    const id = deleting.id;
    try {
      await deleteNote(id);
      applyDeleteLocal(id);
      setDeleting(null);
      toast('留言已删除', 'success');
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        // 服务端已不存在（如已在别处删除）→ 本地同步移除
        applyDeleteLocal(id);
        toast('该留言已不存在', 'info');
      } else if (status === 401) {
        toast('登录已过期，请重新进入管理', 'error');
      } else {
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const goAbout = (e: React.MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    startReveal('about', e.clientX, e.clientY);
  };

  const cards = (list: Note[]) => (
    <div className="home__cards">
      {list.map((note, index) => (
        <Reveal key={note.id} delay={Math.min(index, 6) * 24}>
          <NoteCard note={note} verify admin={isAdmin} onDelete={setDeleting} />
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
      <section className="home__hero" id="top">
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
        {/* 第一屏底部居中的「关于」入口 */}
        <button type="button" className="home__about" onClick={goAbout}>
          关于 →
        </button>
      </section>

      <section className="home__board" id="notes">
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
        <NoteForm bare onCreated={handleCreated} />
      </Modal>

      <Modal open={deleting !== null} title="删除留言" onClose={closeDelete}>
        {deleting ? (
          <div className="home__delete">
            <p className="home__delete-msg">确定删除这条留言？此操作不可恢复。</p>
            <div className="home__delete-actions">
              <Button variant="ghost" onClick={closeDelete} disabled={deleteBusy}>
                取消
              </Button>
              <Button variant="solid" className="home__delete-confirm" onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? '删除中…' : '确认删除'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
