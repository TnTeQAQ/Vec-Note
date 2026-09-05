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
      ).json()) as { results: { ciphertext: string; content: string }[] };
      expect(exact.results.length).toBeGreaterThan(0);
      expect(exact.results[0].content).toBe(content);
      expect(verifyTitle(exact.results[0].ciphertext, '手机')).toBe(true);

      const hand = (await (
        await fetch(`${BASE}/api/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ngram_vector: embed('手')! }),
        })
      ).json()) as { results: { ciphertext: string }[] };
      expect(hand.results.length).toBeGreaterThan(0);
      expect(verifyTitle(hand.results[0].ciphertext, '手')).toBe(false);

      const phone = (await (
        await fetch(`${BASE}/api/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ngram_vector: embed('电话')! }),
        })
      ).json()) as { results: unknown[] };
      expect(phone.results.length).toBe(0);
    },
    30000,
  );
});