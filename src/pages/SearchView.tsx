import { useState, type MouseEvent } from 'react';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteGroupList from '../components/NoteGroupList';
import './SearchView.css';

/**
 * 搜索页：向量召回 Top-10。不做自动验证——用户复制密文到「实验台」自行核查。
 * 结果与留言板共用同一套密文分组组件。
 */
export default function SearchView() {
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const startReveal = usePageReveal();

  const goLab = (e: MouseEvent<HTMLButtonElement>) => {
    if (!isPlainClick(e)) return;
    startReveal('lab', e.clientX, e.clientY);
  };

  return (
    <div className="search">
      <Reveal>
        <h1 className="search__title">搜索</h1>
      </Reveal>

      <Reveal delay={80}>
        <div className="search__bar">
          <SearchForm onResults={setOutcome} />
        </div>
      </Reveal>

      {outcome ? (
        <section className="search__results">
          <div className="search__query-row">
            <p className="search__query">
              「{outcome.query}」 · {outcome.results.length} 条候选
            </p>
            <button type="button" className="search__lab-link" onClick={goLab}>
              去实验台验证 →
            </button>
          </div>
          {outcome.results.length === 0 ? (
            <p className="search__empty">未找到匹配项。</p>
          ) : (
            <NoteGroupList notes={outcome.results} />
          )}
        </section>
      ) : null}
    </div>
  );
}
