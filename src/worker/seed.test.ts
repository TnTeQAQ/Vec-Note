import { describe, expect, it } from 'vitest';
import { VECTOR_DIM, SIMILARITY_EPSILON } from '../shared/constants';
import { embed } from '../lib/embed';
import { verifyTitle } from '../lib/crypto';
import { makeSealKey, seal } from './seal';
import {
  ensureSeedNote,
  SEED_NOTE_CIPHERTEXT,
  SEED_NOTE_CONTENT,
  SEED_NOTE_ID,
  SEED_NOTE_TITLE,
} from './seed';

function cos(a: number[], b: number[]): number {
  let d = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

// 与 seed.ts 中的常量保持一致（存储向量固定随机种子，可复现）。
const SEED_EMBED_SEED = 0x52454144; // 'READ'

type Row = { id: string };

/** 最小假 D1：记录 INSERT 参数；SELECT 按 existing 返回。 */
function makeDb(existing: Row[]) {
  const inserts: unknown[][] = [];
  const fake = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            first: async () => (sql.startsWith('SELECT id FROM notes') ? existing[0] : undefined),
            run: async () => {
              if (sql.startsWith('INSERT OR IGNORE INTO notes')) inserts.push(args);
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
  return { env: { DB: fake } as unknown as { DB: D1Database }, inserts };
}

describe('ensureSeedNote（README 示例留言初始化）', () => {
  it('密文常量确实是 README 的 BLS 签名：README 可验证，其他标题不可验证', () => {
    expect(SEED_NOTE_CIPHERTEXT).toHaveLength(128);
    expect(verifyTitle(SEED_NOTE_CIPHERTEXT, SEED_NOTE_TITLE)).toBe(true);
    // canonical 会 normalize + trim：带空格的输入同样验证通过
    expect(verifyTitle(SEED_NOTE_CIPHERTEXT, ' README ')).toBe(true);
    expect(verifyTitle(SEED_NOTE_CIPHERTEXT, 'READM')).toBe(false);
    expect(verifyTitle(SEED_NOTE_CIPHERTEXT, 'readme')).toBe(false);
  });

  it('数据库为空时种入一条：固定 ID、内容、密文，密封向量与密钥推导一致', async () => {
    const key = makeSealKey('test-secret');
    const { env, inserts } = makeDb([]);
    await ensureSeedNote(env, key);

    expect(inserts).toHaveLength(1);
    const [id, createdAt, content, sealedJson, ciphertext] = inserts[0];
    expect(id).toBe(SEED_NOTE_ID);
    expect(typeof createdAt).toBe('number');
    expect(content).toBe(SEED_NOTE_CONTENT);
    expect(ciphertext).toBe(SEED_NOTE_CIPHERTEXT);

    const vec = JSON.parse(sealedJson as string) as number[];
    expect(vec).toHaveLength(VECTOR_DIM);
    expect(vec).toEqual(
      seal(embed(SEED_NOTE_TITLE, { forStorage: true, seed: SEED_EMBED_SEED })!, key),
    );
  });

  it('已存在时不再重复种入', async () => {
    const key = makeSealKey('test-secret');
    const { env, inserts } = makeDb([{ id: SEED_NOTE_ID }]);
    await ensureSeedNote(env, key);
    expect(inserts).toHaveLength(0);
  });

  it('并发调用只种入一次（惰性闩锁）', async () => {
    const key = makeSealKey('test-secret');
    const { env, inserts } = makeDb([]);
    await Promise.all([ensureSeedNote(env, key), ensureSeedNote(env, key), ensureSeedNote(env, key)]);
    expect(inserts).toHaveLength(1);
  });

  it('README 检索召回：密封后的存储向量与检索向量余弦远超阈值', async () => {
    const key = makeSealKey('test-secret');
    const stored = seal(embed(SEED_NOTE_TITLE, { forStorage: true, seed: SEED_EMBED_SEED })!, key);
    for (let i = 0; i < 5; i++) {
      const q = seal(embed(SEED_NOTE_TITLE)!, key);
      expect(cos(q, stored)).toBeGreaterThan(SIMILARITY_EPSILON);
    }
  });
});
