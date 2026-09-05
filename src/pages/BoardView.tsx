import { useCallback, useEffect, useState } from 'react';
import { listNotes, type Note } from '../lib/api';
import Reveal from '../components/Reveal';
import SectionHead from '../components/SectionHead';
import NoteForm from '../components/NoteForm';
import NoteCard from '../components/NoteCard';
import './BoardView.css';

/** 留言板：发布（本地向量化 + BLS 签名）与最近留言列表。 */
export default function BoardView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
    void refresh();
  }, [refresh]);

  return (
    <div className="board">
      <Reveal>
        <h1 className="board__title">留言板</h1>
      </Reveal>

      <Reveal delay={80} className="board__form">
        <NoteForm onCreated={() => void refresh()} />
      </Reveal>

      <section className="board__section">
        <Reveal>
          <SectionHead title="最近留言" />
        </Reveal>
        {error && <p className="board__error">加载失败：{error}</p>}
        {loading ? (
          <p className="board__empty">加载中…</p>
        ) : notes.length === 0 ? (
          <p className="board__empty">暂无留言</p>
        ) : (
          <div className="board__notes">
            {notes.map((note, index) => (
              <Reveal key={note.id} delay={Math.min(index, 6) * 45}>
                <NoteCard note={note} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
