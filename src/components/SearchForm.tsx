import { useState } from 'react';
import { embed } from '../lib/embed';
import { searchNotes, type SearchResult } from '../lib/api';
import Button from './Button';
import './SearchForm.css';

export type SearchOutcome = {
  query: string;
  results: SearchResult[];
};

/** 搜索表单：查询词本地向量化后交 Worker 密封召回。结果由调用方渲染。 */
export default function SearchForm({ onResults }: { onResults: (o: SearchOutcome | null) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = query.trim();
    if (!q) return;

    const vector = embed(q);
    if (!vector) {
      setError('查询词规范化后为空');
      return;
    }

    setLoading(true);
    try {
      const { results } = await searchNotes(vector);
      onResults({ query: q, results });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="search-form" onSubmit={handleSearch}>
      <div className="search-form__row">
        <input
          className="field search-form__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索（如：手机 / 手）"
          autoComplete="off"
        />
        <Button type="submit" variant="solid" size="md" disabled={loading || !query.trim()}>
          {loading ? '搜索中…' : '搜索'}
        </Button>
      </div>
      {error && <p className="search-form__error">{error}</p>}
    </form>
  );
}
