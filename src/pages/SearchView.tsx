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
        <p className="search__subtitle">
          查询词本地向量化 → Worker 密封后按余弦相似度召回 Top-10（不返回相似度与向量）
          → 前端对每条结果 BLS 验签。
        </p>
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
            <p className="search__empty">
              未找到匹配项。当前为字符 n-gram 重叠匹配：无共享字符的近似词（如「电话」搜「手机」）不会命中。
            </p>
          ) : (
            <div className="search__list">
              {outcome.results.map((r, index) => {
                const dec = decryptTitle(r.ciphertext, outcome.query);
                return (
                  <Reveal key={r.id} delay={Math.min(index, 6) * 45}>
                    <article className="search-result">
                      <div className="search-result__head">
                        <Badge ok={dec.ok} label={dec.ok ? `✓ ${dec.label}` : dec.label} />
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
      ) : (
        <Reveal delay={140}>
          <div className="search__tips">
            <p className="search__tips-title">对照示例</p>
            <ul className="search__tips-list">
              <li>搜「手机」→ 命中，显示「✓ 解密成功」</li>
              <li>搜「手」→ 命中（共享字符，向量重叠），显示「相似候选」</li>
              <li>搜「电话」→ 不命中（仅字符 n-gram，无共享字符；这是已接受的取舍）</li>
            </ul>
          </div>
        </Reveal>
      )}
    </div>
  );
}
