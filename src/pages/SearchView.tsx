import { useState, type MouseEvent } from 'react';
import { isPlainClick, usePageReveal } from '../components/page-reveal-context';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import CipherChip from '../components/CipherChip';
import './SearchView.css';

/**
 * 搜索页：向量召回 Top-10 + 匹配度。
 * 不做任何自动验证——用户复制密文到「实验台」自行核查（BLS 验签）。
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
            <div className="search__list">
              {outcome.results.map((r, index) => (
                <Reveal key={r.id} delay={Math.min(index, 6) * 45}>
                  <article className="search-result">
                    <CipherChip value={r.ciphertext} />
                    <p className="search-result__content selectable">{r.content}</p>
                    <div className="search-result__meta">
                      <span className="search-result__id">#{r.id.slice(0, 8)}</span>
                      <span>{new Date(r.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
