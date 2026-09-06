import { useEffect, useState, type MouseEvent } from 'react';
import { listNotes, type Note } from '../lib/api';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteCard from '../components/NoteCard';
import './HomeView.css';

/**
 * 论坛式主页：搜索 + 留言流一体，按时间先后扁平展示（不分组），
 * 顶部「发布留言 →」进入表单页。
 */
export default function HomeView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const startReveal = usePageReveal();

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

  const goBoard = (e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    startReveal('board', e.clientX, e.clientY);
  };

  const shown = outcome ? outcome.results : notes;

  return (
    <div className="home">
      <div className="home__head">
        <h1 className="home__title">Vec-Note</h1>
        <Button variant="solid" size="md" onClick={goBoard}>
          发布留言 →
        </Button>
      </div>

      <Reveal delay={60}>
        <div className="home__search">
          <SearchForm onResults={setOutcome} />
        </div>
      </Reveal>

      <section className="home__list">
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
              <div className="home__cards">
                {outcome.results.map((note, index) => (
                  <Reveal key={note.id} delay={Math.min(index, 6) * 24}>
                    <NoteCard note={note} verify />
                  </Reveal>
                ))}
              </div>
            )}
          </>
        ) : loading ? (
          <p className="home__empty">加载中…</p>
        ) : error ? (
          <p className="home__error">加载失败：{error}</p>
        ) : notes.length === 0 ? (
          <p className="home__empty">暂无留言，点右上角「发布留言」写下第一条吧。</p>
        ) : (
          <div className="home__cards">
            {notes.map((note, index) => (
              <Reveal key={note.id} delay={Math.min(index, 6) * 24}>
                <NoteCard note={note} verify />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
