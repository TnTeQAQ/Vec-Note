import { useEffect, useState, type MouseEvent } from 'react';
import { listNotes, type Note } from '../lib/api';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import SectionHead from '../components/SectionHead';
import NoteCard from '../components/NoteCard';
import './HomeView.css';

export default function HomeView() {
  // home teaser: only the most recent notes
  const [notes, setNotes] = useState<Note[]>([]);
  const startReveal = usePageReveal();

  useEffect(() => {
    let alive = true;
    listNotes(2)
      .then(({ notes }) => {
        if (alive) setNotes(notes);
      })
      .catch(() => {
        /* 首页预览失败不阻塞 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const go = (id: string, e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    startReveal(id, e.clientX, e.clientY);
  };

  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__hero-inner">
          <Reveal delay={80}>
            <h1 className="home__title">Vec-Note</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="home__subtitle">留言 + 搜索，标题明文从不入库。</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="home__cta">
              <Button variant="solid" size="lg" onClick={(e) => go('board', e)}>
                去留言 →
              </Button>
              <Button variant="outline" size="lg" onClick={(e) => go('search', e)}>
                搜索留言
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="home__section">
        <Reveal>
          <SectionHead title="Latest notes" target="board" actionLabel="View all →" />
        </Reveal>
        <div className="home__notes">
          {notes.map((note, index) => (
            <Reveal key={note.id} delay={index * 60}>
              <NoteCard note={note} />
            </Reveal>
          ))}
          {notes.length === 0 ? <p className="home__empty">还没有留言，去写下第一条吧。</p> : null}
        </div>
      </section>
    </div>
  );
}
