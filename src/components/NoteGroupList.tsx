import { useMemo, useState } from 'react';
import type { Note } from '../lib/api';
import Reveal from './Reveal';
import NoteCard from './NoteCard';
import CipherChip from './CipherChip';
import './NoteGroupList.css';

/**
 * 按密文标签分组的留言列表（可折叠）。
 *
 * BLS 签名是确定性的——同一标题的所有留言共享同一密文，因此按密文分组
 * 即「按标题身份分组」，且无需知道标题明文。留言板与搜索结果共用。
 *
 * 交互：点组头折叠/展开（组内的密文胶囊仍可点击复制，事件不冒泡）。
 */
export default function NoteGroupList({ notes }: { notes: Note[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const byCipher = new Map<string, Note[]>();
    for (const note of notes) {
      const list = byCipher.get(note.ciphertext) ?? [];
      list.push(note);
      byCipher.set(note.ciphertext, list);
    }
    // 组内最新在前（最早发的在最下面）
    return [...byCipher.entries()].map(([ciphertext, items]) => ({
      ciphertext,
      items: items.sort((a, b) => b.created_at - a.created_at),
    }));
  }, [notes]);

  const toggle = (ciphertext: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(ciphertext)) next.delete(ciphertext);
      else next.add(ciphertext);
      return next;
    });
  };

  return (
    <div className="note-groups">
      {groups.map((group, index) => {
        const isCollapsed = collapsed.has(group.ciphertext);
        return (
          <Reveal key={group.ciphertext} delay={Math.min(index, 6) * 45}>
            <section className="note-group">
              <div
                className="note-group__head"
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                onClick={() => toggle(group.ciphertext)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle(group.ciphertext);
                  }
                }}
              >
                <CipherChip value={group.ciphertext} />
                <span className="note-group__count">× {group.items.length}</span>
                <span
                  className={`note-group__arrow${isCollapsed ? ' note-group__arrow--closed' : ''}`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </div>
              {!isCollapsed && (
                <div className="note-group__items">
                  {group.items.map((note) => (
                    <NoteCard key={note.id} note={note} hideChip />
                  ))}
                </div>
              )}
            </section>
          </Reveal>
        );
      })}
    </div>
  );
}
