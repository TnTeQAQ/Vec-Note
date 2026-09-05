import { useCallback, useEffect, useMemo, useState } from 'react';
import { listNotes, type Note } from '../lib/api';
import Reveal from '../components/Reveal';
import SectionHead from '../components/SectionHead';
import NoteForm from '../components/NoteForm';
import NoteCard from '../components/NoteCard';
import CipherChip from '../components/CipherChip';
import './BoardView.css';

/**
 * 留言板：发布 + 按密文标签分组展示。
 * BLS 签名是确定性的——同一标题的所有留言共享同一密文，
 * 因此按密文分组即「按标题身份分组」，且无需知道标题明文。
 */
export default function BoardView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  const groups = useMemo(() => {
    const byCipher = new Map<string, Note[]>();
    for (const note of notes) {
      const list = byCipher.get(note.ciphertext) ?? [];
      list.push(note);
      byCipher.set(note.ciphertext, list);
    }
    return [...byCipher.entries()].map(([ciphertext, items]) => ({ ciphertext, items }));
  }, [notes]);

  const toggle = (ciphertext: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(ciphertext)) next.delete(ciphertext);
      else next.add(ciphertext);
      return next;
    });
  };

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
        ) : groups.length === 0 ? (
          <p className="board__empty">暂无留言</p>
        ) : (
          <div className="board__groups">
            {groups.map((group, index) => {
              const isCollapsed = collapsed.has(group.ciphertext);
              return (
                <Reveal key={group.ciphertext} delay={Math.min(index, 6) * 45}>
                  <section className="note-group">
                    <div
                      className="note-group__head"
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      onClick={() => toggle(group.ciphertext)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle(group.ciphertext);
                        }
                      }}
                    >
                      <CipherChip value={group.ciphertext} />
                      <span className="note-group__count">× {group.items.length}</span>
                      <span
                        className={`note-group__arrow${isCollapsed ? ' note-group__arrow--closed' : ''}`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div className="note-group__items">
                        {group.items.map((note) => (
                          <NoteCard key={note.id} note={note} hideChip />
                        ))}
                      </div>
                    )}
                  </section>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
