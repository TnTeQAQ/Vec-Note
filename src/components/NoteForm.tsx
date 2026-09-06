import { useState } from 'react';
import { embed } from '../lib/embed';
import { signTitle } from '../lib/crypto';
import { createNote } from '../lib/api';
import { CONTENT_MAX_LENGTH } from '../shared/constants';
import Button from './Button';
import CipherChip from './CipherChip';
import Modal from './Modal';
import './NoteForm.css';

/**
 * 发布留言：标题在浏览器本地向量化 + BLS 签名（即密文），只上传
 * 内容 + 公开向量 + 密文；标题明文从不离开浏览器。
 * bare：在弹窗等外层已带边框的容器里使用，去掉自身边框与内边距。
 */
export default function NoteForm({
  onCreated,
  bare = false,
}: {
  onCreated: () => void;
  bare?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cipher, setCipher] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCipher(null);

    // 存储模式：随机丢弃部分词项，使子字检索呈概率性命中
    const vector = embed(title, { forStorage: true });
    if (!vector) {
      setError('标题经规范化后为空，请输入有效标题');
      return;
    }

    let ct: string;
    try {
      ct = signTitle(title);
    } catch (err) {
      setError('加密失败：' + (err instanceof Error ? err.message : String(err)));
      return;
    }

    setSubmitting(true);
    try {
      const note = await createNote(content.trim(), vector, ct);
      setCipher(note.ciphertext);
      setTitle('');
      setContent('');
      onCreated();
    } catch (err) {
      const limited = (err as { rateLimited?: boolean }).rateLimited === true;
      if (limited) setRateLimited(true);
      else setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`note-form${bare ? ' note-form--bare' : ''}`} onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="note-title">
        标题
      </label>
      <input
        className="field"
        id="note-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="请输入标题"
        autoComplete="off"
      />

      <label className="field-label" htmlFor="note-content">
        内容
      </label>
      <textarea
        className="field"
        id="note-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="请输入内容"
        rows={4}
        maxLength={CONTENT_MAX_LENGTH}
      />

      <div className="note-form__actions">
        {/* Button spreads {…rest} last, so type="submit" overrides its
            built-in type="button" and this becomes the real submit trigger. */}
        <Button type="submit" variant="solid" disabled={!canSubmit}>
          {submitting ? '提交中…' : '发布留言'}
        </Button>
      </div>

      {error && <p className="note-form__error">{error}</p>}
      {cipher && (
        <div className="note-form__hint">
          <CipherChip value={cipher} />
        </div>
      )}

      <Modal open={rateLimited} title="发送受限" onClose={() => setRateLimited(false)}>
        <p className="note-form__ratelimit-msg">
          同一 IP 每分钟只能发送一条留言，请稍后再试。
        </p>
        <div className="note-form__actions">
          <Button variant="solid" onClick={() => setRateLimited(false)}>
            知道了
          </Button>
        </div>
      </Modal>
    </form>
  );
}
