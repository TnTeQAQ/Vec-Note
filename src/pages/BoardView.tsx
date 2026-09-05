import { useCallback, useEffect, useState } from 'react';
import { listNotes, type Note } from '../lib/api';
import Reveal from '../components/Reveal';
import SectionHead from '../components/SectionHead';
import NoteForm from '../components/NoteForm';
import NoteGroupList from '../components/NoteGroupList';
import './BoardView.css';

/** 留言板：发布 + 按密文标签分组展示（与搜索结果共用 NoteGroupList）。 */
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
          <NoteGroupList notes={notes} />
        )}
      </section>
    </div>
  );
}
