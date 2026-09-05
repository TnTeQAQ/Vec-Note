import { useState } from 'react';
import { decryptTitle } from '../lib/decrypt';
import type { SearchResult } from '../lib/api';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import CipherChip from '../components/CipherChip';
import Badge from '../components/Badge';
import './SearchView.css';

/** 搜索页：向量召回 Top-10，前端对每条结果验签并标注「解密成功 / 相似候选」。 */
export default function SearchView() {
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);

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
          <p className="search__query">
            「{outcome.query}」 · {outcome.results.length} 条候选
          </p>
          {outcome.results.length === 0 ? (
            <p className="search__empty">未找到匹配项。</p>
          ) : (
            <div className="search__list">
              {outcome.results.map((r, index) => {
                const dec = decryptTitle(r.ciphertext, outcome.query);
                const pct =
                  typeof r.similarity === 'number'
                    ? `${(r.similarity * 100).toFixed(1)}%`
                    : null;
                return (
                  <Reveal key={r.id} delay={Math.min(index, 6) * 45}>
                    <article className="search-result">
                      <div className="search-result__head">
                        <div className="search-result__flags">
                          <Badge ok={dec.ok} label={dec.ok ? `✓ ${dec.label}` : dec.label} />
                          {pct && <span className="search-result__score">匹配 {pct}</span>}
                        </div>
                        <span className="search-result__id">#{r.id.slice(0, 8)}</span>
                      </div>
                      <CipherChip value={r.ciphertext} />
                      <p className="search-result__content selectable">{r.content}</p>
                      <div className="search-result__meta">
                        {new Date(r.created_at).toLocaleString('zh-CN')}
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
