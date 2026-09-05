import { useEffect, useState, type MouseEvent } from 'react';
import { listNotes, type Note } from '../lib/api';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import SectionHead from '../components/SectionHead';
import NoteCard from '../components/NoteCard';
import './HomeView.css';

const FEATURES = [
  {
    title: '向量召回',
    body: '标题在浏览器内被字符 n-gram 向量化，只上传公开向量。搜索按余弦相似度返回 Top-10 相似候选。',
  },
  {
    title: '签名即密文',
    body: '标题的 BLS12-381 签名作为「密文」入库。明文不可从签名反推，验签通过才算「解密成功」。',
  },
  {
    title: '服务端密封',
    body: 'Worker 用仅服务端持有的密钥对向量做「签名置换」密封：精确保持余弦，数据库无法反推标题。',
  },
];

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
            <p className="home__subtitle">
              向量留言板 —— 标题明文从不离开浏览器、从不入库：
              被向量化用于近似检索，被 BLS12-381 签名（作为密文）用于唯一验证。
            </p>
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

      <section className="home__section">
        <Reveal>
          <SectionHead title="How it works" />
        </Reveal>
        <div className="home__features">
          {FEATURES.map((f, index) => (
            <Reveal key={f.title} delay={index * 70}>
              <div className="home__feature">
                <h3 className="home__feature-title">{f.title}</h3>
                <p className="home__feature-body">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home__section">
        <Reveal>
          <SectionHead title="About" />
        </Reveal>
        <Reveal delay={60}>
          <p className="home__about">
            一份「非对称签名/验签 + 密文不可反推标题」形态的最小演示。完整密码学说明与已知取舍
            <button type="button" className="home__link" onClick={(e) => go('about', e)}>
              阅读更多 →
            </button>
          </p>
        </Reveal>
      </section>
    </div>
  );
}
