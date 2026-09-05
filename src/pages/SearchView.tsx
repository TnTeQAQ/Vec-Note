import { useState, type MouseEvent } from 'react';
import Reveal from '../components/Reveal';
import SearchForm, { type SearchOutcome } from '../components/SearchForm';
import NoteGroupList from '../components/NoteGroupList';
import './SearchView.css';

/**
 * 搜索页：向量召回 Top-20。不做自动验证——每张卡片上的「去验证」
 * 会带着密文跳转到实验台，由用户输入候选标题手动核查。
 */
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
            /* key 按查询词重挂载：每次新搜索重置折叠状态，避免旧折叠隐藏结果 */
            <NoteGroupList key={outcome.query} notes={outcome.results} />
          )}
        </section>
      ) : null}
    </div>
  );
}
