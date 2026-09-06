import { type MouseEvent } from 'react';
import { usePageReveal } from '../components/page-reveal-context';
import Reveal from '../components/Reveal';
import BackLink from '../components/BackLink';
import NoteForm from '../components/NoteForm';
import './BoardView.css';

/** 发布留言表单页：提交成功后回到主页留言流。 */
export default function BoardView() {
  const startReveal = usePageReveal();

  const goHome = (e?: MouseEvent<HTMLElement>) => {
    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    startReveal('home', x, y);
  };

  return (
    <div className="board">
      <BackLink />
      <Reveal>
        <h1 className="board__title">发布留言</h1>
      </Reveal>

      <Reveal delay={80} className="board__form">
        <NoteForm onCreated={() => goHome()} />
      </Reveal>
    </div>
  );
}
