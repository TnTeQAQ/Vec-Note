/// <reference types="@cloudflare/workers-types" />

import { VECTOR_DIM } from '../shared/constants';
import { embed } from '../lib/embed';
import { seal, type SealKey } from './seal';

// 站点初始化：数据库首次被访问时种入一条 README 示例留言。
// 密封向量（sealed_vector）必须在运行时用真实的 VEC_SEAL_SECRET 计算，
// 因此放在 Worker 初始化代码里，而不是 SQL 迁移里（迁移无法预知部署环境的密钥）。
// 该逻辑与 admin.ts 的 ensureAdminRow 惰性初始化同构：固定 ID + INSERT OR IGNORE，天然幂等。

/** 示例留言固定 ID（UUID 风格，卡片头部显示为 #8f3a2c1d，与普通留言一致）：无论多少个隔离区、多少次请求，只会种入一条。 */
export const SEED_NOTE_ID = '8f3a2c1d-4e5f-4a9b-8c7d-2e3f4a5b6c7d';
/** 示例留言标题（搜索它的关键词、验证它的明文）。 */
export const SEED_NOTE_TITLE = 'README';
/**
 * signTitle('README') 的确定性输出：BLS12-381 G2 96 字节压缩签名（base64url，128 字符）。
 * 由 src/lib/crypto.ts 中 SEED='解密成功' 派生的私钥生成；若该种子被修改，须同步更新
 * 此常量，并在 seed.test.ts 中断言 verifyTitle(此值, 'README') === true。
 */
export const SEED_NOTE_CIPHERTEXT =
  'kOIQmN4Dlr4Zrlvk_1GqvuCGBKGg9Zt7eL-PzamC2_Y8uraSgJ44iGRntl-ZOI9IF4fyOC9Li8yE_Tg5VW5E4u9gbJa0AysCpahDo0DCGkgVgFOaCpuQactP0yLU8tHW';
/** 示例留言内容（净化后的 Markdown 渲染）。 */
export const SEED_NOTE_CONTENT = [
  '这是一条站点内置的示例留言，用于帮助您快速上手本站。',
  '',
  '1. 本留言标题为 README（明文标题）：点击卡片上的「去验证」，输入 `README` 并点击「核查」，即可验证本条留言（提示「验证成功」）；',
  '2. 在搜索框输入 `README`，可检索到本条留言；',
  '3. 如需发布留言，请点击首页搜索框下方的「发布留言」按钮，填写标题与内容后提交；标题为明文标题。',
].join('\n');
/**
 * 存储侧向量用固定随机种子：保证任意隔离区种出的向量一致（可复现、可测试）。
 * 检索侧查询向量带随机抖动，实测同词召回余弦 ≈ 0.85，远超 0.05 阈值。
 */
const SEED_EMBED_SEED = 0x52454144; // 'READ'

let seeding: Promise<void> | null = null;

/**
 * 确保 README 示例留言已存在；不存在则种入（固定 ID + INSERT OR IGNORE，只插一次）。
 * 在首页列表（GET /api/notes）与搜索（POST /api/search）前调用，保证全新数据库
 * 第一次被访问时自动完成初始化。
 */
export async function ensureSeedNote(env: { DB: D1Database }, key: SealKey): Promise<void> {
  if (seeding) {
    await seeding;
    return;
  }
  seeding = (async () => {
    try {
      const existing = await env.DB.prepare('SELECT id FROM notes WHERE id = ?')
        .bind(SEED_NOTE_ID)
        .first();
      if (existing) return;

      const vec = embed(SEED_NOTE_TITLE, { forStorage: true, seed: SEED_EMBED_SEED });
      if (!vec || vec.length !== VECTOR_DIM) return;

      await env.DB.prepare(
        'INSERT OR IGNORE INTO notes (id, created_at, content, sealed_vector, title_ct) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(
          SEED_NOTE_ID,
          Date.now(),
          SEED_NOTE_CONTENT,
          JSON.stringify(seal(vec, key)),
          SEED_NOTE_CIPHERTEXT,
        )
        .run();
    } finally {
      seeding = null;
    }
  })();
  await seeding;
}
