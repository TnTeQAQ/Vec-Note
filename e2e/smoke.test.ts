import { describe, expect, it } from 'vitest';
import { embed } from '../src/lib/embed';
import { signTitle, verifyTitle } from '../src/lib/crypto';

// 端到端冒烟测试：需要本地已运行 `wrangler dev`（且已 `pnpm db:migrate:local`）。
// 仅在手动执行 `npx vitest run e2e/smoke.test.ts` 时运行，不在 `pnpm test` 默认范围内。
const BASE = 'http://127.0.0.1:8787';

describe('e2e smoke (live wrangler dev)', () => {
  it(
    'submit 手机/测试内容 → search 手机 hits (解密成功), 手 hits (相似), 电话 no hit',
    async () => {
      const title = '手机';
      const content = '测试内容';
      const ct = signTitle(title);
      // 检索模式向量（完整词项 + 抖动）；存储侧的随机丢弃由 UI 在提交时启用
      const vector = embed(title)!;

      const home = await fetch(`${BASE}/`);
      expect(home.status).toBe(200);
      expect(await home.text()).toContain('Vec-Note');

      const before = (await (await fetch(`${BASE}/api/notes`)).json()) as { notes: unknown[] };
      expect(Array.isArray(before.notes)).toBe(true);

      const createRes = await fetch(`${BASE}/api/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, ngram_vector: vector, title_ct: ct }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { ciphertext: string; content: string };
      expect(created.ciphertext).toBe(ct);
      expect(created.content).toBe(content);

      const exact = (await (
        await fetch(`${BASE}/api/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ngram_vector: embed('手机')! }),
        })
      ).json()) as { results: { ciphertext: string; content: string; similarity?: number }[] };
      expect(exact.results.length).toBeGreaterThan(0);
      expect(exact.results[0].content).toBe(content);
      expect(verifyTitle(exact.results[0].ciphertext, '手机')).toBe(true);
      // 同词相似度因抖动永不达到 100%，但仍稳定召回
      expect(typeof exact.results[0].similarity).toBe('number');
      expect(exact.results[0].similarity!).toBeLessThan(1);
      expect(exact.results[0].similarity!).toBeGreaterThan(0.5);

      const hand = (await (
        await fetch(`${BASE}/api/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ngram_vector: embed('手')! }),
        })
      ).json()) as { results: { ciphertext: string; similarity?: number }[] };
      // 检索模式存储的向量包含「手」词项 → 必命中，且验签不过（相似候选）
      expect(hand.results.length).toBeGreaterThan(0);
      expect(verifyTitle(hand.results[0].ciphertext, '手')).toBe(false);
      expect(hand.results[0].similarity!).toBeLessThan(exact.results[0].similarity!);

      const phone = (await (
        await fetch(`${BASE}/api/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ngram_vector: embed('电话')! }),
        })
      ).json()) as { results: unknown[] };
      // 无共享字符 → 只剩噪声级重叠，低于 5% 阈值 → 无结果
      expect(phone.results.length).toBe(0);
    },
    30000,
  );
});