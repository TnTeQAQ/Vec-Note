# Vec-Note

**English** | [简体中文](./README.zh-CN.md)

A minimalist note board with privacy built in. The **plaintext title never leaves the browser and is never stored in the database**: the title is turned into a vector (character n-grams) for fuzzy retrieval and signed with BLS12-381 (serving as the "ciphertext") for unique verification. The Worker seals the vectors with a server-side secret (a signed permutation), so the vectors at rest cannot be inverted back into the title.

- **Frontend:** React 19 + Vite + TypeScript — fully client-side vectorization, signing and verification
- **Backend:** Cloudflare Workers (static assets + `/api`)
- **Database:** Cloudflare D1 (SQLite)
- **Crypto:** [`@noble/curves`](https://github.com/paulmillr/noble-curves) BLS12-381

## Features

- Post notes with a title + Markdown content; only the content, public vectors and signature are uploaded
- Fuzzy search by cosine similarity over sealed vectors (30% threshold, shared n-gram slot required)
- Manual verification modal: enter a candidate title and check it against the ciphertext via BLS verification — no automatic guessing
- Hidden admin entry (long-press): delete notes, pin notes, change password
- Rate limiting, admin session tokens, PBKDF2-SHA256 password hashing
- Light / dark theme following the system preference, smooth scrolling, animated modals
- One-command local development with local D1 — no Cloudflare account needed to try it

## How it works

1. **Post:** the browser runs `embed()` on the title (character n-gram feature hashing + Gaussian jitter; terms are randomly dropped on the storage side) and `signTitle()` (BLS signature), then uploads only `content + public vector + ciphertext`.
2. **Store:** the Worker seals the public vector with `VEC_SEAL_SECRET` into `sealed_vector` and persists it; `title_ct` is the signature; `content` is plaintext.
3. **Search:** the query is vectorized in the browser → sealed by the Worker → every candidate above 30% cosine similarity sharing at least one n-gram hash slot is recalled (sorted by similarity; the raw vector/score are never returned). The app never auto-verifies: click "Verify" on a card and manually enter a candidate title; a passing BLS check shows "✓ verified".
4. **Pin:** admins can pin / unpin any note (`PATCH /api/notes/:id/pin`, Bearer session required). Pinned notes get a badge for all visitors and always sort first (list: pin time desc → creation time desc; search: pinned first → similarity desc).

Example (post title `手机` / "phone", content `测试内容`):

- Search `手机` → hit, ~89% similarity (jitter means the same word never scores 100%).
- Search `手` → may hit (~70%: shared character + storage-side term dropping); the ciphertext can then be verified in the modal.
- Search `电话` → no hit (no shared characters; only noise-level overlap).

### Signature as ciphertext (BLS12-381)

- The signing key seed is the fixed UTF-8 string `解密成功`: `sk = SHA-256("解密成功") mod r`, `pk = sk·G`.
- The "ciphertext" is the BLS signature over the title (96 bytes → base64url).
- "Verification succeeds" means the signature verifies against the public key, the candidate plaintext and the ciphertext. The title cannot be recovered from a signature.
- BLS12-381 is a pairing-friendly curve from the same family used in ZK proofs (e.g. Groth16).

> **Demo limitation:** in a pure-frontend project the "private key" ships inside the JavaScript bundle, so this is not secrecy from someone reading the code — it demonstrates the asymmetric sign/verify shape and a ciphertext from which the title cannot be inverted. The privacy property actually achieved is: **the plaintext title never leaves the browser, never enters the database or logs**.

### Vectors cannot be inverted (signed-permutation sealing)

The character n-gram alphabet is small (a few thousand common characters), so storing public hashes would let an attacker hash a dictionary character by character. Instead the Worker derives a "signed permutation" (random permutation + per-dimension ±1 — an orthogonal matrix) from a server-only secret:

- An orthogonal transform **preserves cosine similarity exactly**, so retrieval order is unchanged.
- The "character → hash bucket" mapping is scrambled by the secret; without it, characters cannot be inverted from `sealed_vector`.
- **Random jitter + term dropping:** each embedding gets Gaussian noise at σ = 0.35 (expected cosine of two embeddings of the same text ≈ 89%, never 100%); each term is kept with 70% probability (sub-character hits become probabilistic). Unrelated words leave only noise-level overlap, filtered by the 30% threshold + shared-slot requirement.
- The API returns match percentages but never the vector fields.
- Residual leak: the term-count / magnitude histogram (roughly the magnitude order of the normalized title).

## Quick start (local development)

Requirements: **Node.js 22+** and **pnpm 11+** (e.g. `corepack enable`). No Cloudflare account is required — D1 runs locally under `.wrangler/state`.

```bash
# 1. Install dependencies
pnpm install

# 2. Local worker config: the example works as-is for `wrangler dev`
cp wrangler.example.jsonc wrangler.jsonc   # PowerShell: copy wrangler.example.jsonc wrangler.jsonc

# 3. Local server secret (any long random string; never commit this file)
cp .dev.vars.example .dev.vars
#   then edit .dev.vars, e.g. generate one with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Create the local D1 schema
pnpm db:migrate:local

# 5. Run (vite build && wrangler dev)
pnpm dev
```

Open the URL printed by wrangler, by default **http://localhost:8787**.

Other scripts:

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Build frontend + start `wrangler dev` (assets + API + local D1) |
| `pnpm build` | Vite production build into `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit/integration tests |
| `pnpm db:migrate:local` | Apply migrations to local D1 |
| `pnpm db:create` | Create a remote D1 database |
| `pnpm db:migrate:remote` | Apply migrations to remote D1 |
| `pnpm deploy` | Build + `wrangler deploy` |
| `pnpm dry-run` | Validate the worker bundle without deploying |

## Deploy to Cloudflare

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up), then either use the dashboard once (`wrangler login`) or create an [API token](https://dash.cloudflare.com/profile/api-tokens) with Workers + D1 permissions and export `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

```bash
# 1. Create the D1 database — copy the printed database_id
pnpm db:create

# 2. Paste the database_id into wrangler.jsonc
#    (optionally add a custom domain under "routes")

# 3. Apply the schema to the remote database
pnpm db:migrate:remote

# 4. Store the sealing secret (32+ random bytes, server-only)
pnpm wrangler secret put VEC_SEAL_SECRET

# 5. Deploy
pnpm deploy
```

After the first deploy you get `https://<worker-name>.<your-subdomain>.workers.dev`. A custom domain can be added via the commented-out `routes` block in `wrangler.jsonc`.

> ⚠️ **Do not change `VEC_SEAL_SECRET` once notes exist.** Sealing is deterministic per secret; changing it makes previously sealed vectors incompatible with new search vectors (old notes stop appearing in search). Rotate only with a re-sealing migration or an empty database.

### Deploy with GitHub Actions

The workflow at `.github/workflows/deploy.yml` always runs typecheck + build, and deploys only when the repository opts in — forks are safe by default. In your repository's **Settings → Secrets and variables → Actions**:

- **Variables**
  - `ENABLE_DEPLOY` = `true` — master switch for auto-deploy on push to `main`
  - `CF_DATABASE_ID` — the UUID from `pnpm db:create` (required for deploy)
  - `CF_WORKER_NAME` — Worker name (optional, defaults to `vec-note`; must be unique on `workers.dev`)
  - `CF_ROUTE_PATTERN` — custom domain, e.g. `notes.example.com` (optional)
  - `CF_SITE_URL` — canonical public origin, e.g. `https://notes.example.com` (optional; when unset, canonical/OG URLs and the sitemap are derived from each request's Host automatically)
- **Secrets**
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

The workflow generates `wrangler.jsonc` in CI (it is git-ignored), applies the idempotent D1 migrations, then deploys.

## SEO

The app ships search-engine and social-sharing support out of the box:

- Real per-page URLs: the home board is `/` and the technical write-up lives at `/about` (shareable and independently indexable); in-app navigation still keeps the clean single-root experience.
- Per-page `<title>`, `meta description`, canonical, Open Graph and Twitter Card tags, plus JSON-LD structured data (`WebSite` / `TechArticle`), injected server-side from `src/shared/seo.ts` and kept in sync on the client.
- `/robots.txt` (allows pages, disallows `/api/`) and `/sitemap.xml` are generated by the Worker against the active origin — no hardcoded domain in the repo.
- Unknown paths return a real HTTP 404 instead of a soft-200 SPA fallback.
- A brand share image is included at `/og.svg`.

After deploying, register and verify the site in [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters) (and Baidu 站长平台 if targeting Baidu), then submit `https://<your-domain>/sitemap.xml` and request indexing of `/` and `/about`. Set `SITE_URL` (or the `CF_SITE_URL` variable) when the site is reachable through several hostnames, so canonical URLs always point at your preferred domain.

## Configuration reference

| Item | Where | Notes |
| --- | --- | --- |
| `wrangler.jsonc` | local only (copied from `wrangler.example.jsonc`) | Worker name, optional custom domain, D1 `database_id` |
| `.dev.vars` | local only | `VEC_SEAL_SECRET` for `wrangler dev` |
| `VEC_SEAL_SECRET` | Worker secret | Server-side sealing key; keep it stable |
| `SITE_URL` | Worker variable (optional) | Canonical origin for SEO tags/sitemap; defaults to the request Host |
| Retrieval thresholds | `src/shared/constants.ts` | `SIMILARITY_EPSILON`, jitter σ, keep probability, etc. |
| Content limit | `src/shared/constants.ts` | `CONTENT_MAX_LENGTH` (16000) |

## Seed note

On the first database access (home list or first search), the Worker lazily seeds a single demo note titled **README** (fixed id `8f3a2c1d-4e5f-4a9b-8c7d-2e3f4a5b6c7d`, idempotent):

- Its content is a quick-start hint: click "Verify" on the card and enter `README` → verification passes; searching `README` also finds it.
- The ciphertext is the deterministic output of `signTitle('README')`; the sealed vector is computed at runtime with the deployment's real `VEC_SEAL_SECRET` (SQL migrations cannot know it), which is why seeding lives in Worker code.
- Implementation: `src/worker/seed.ts`; behavior test: `src/worker/seed.test.ts`.

## Hidden admin (long-press 10 seconds)

**Press and hold the theme-toggle button for 10 seconds** to bring up the password dialog (no animation, no theme switch):

- **Default password `admin`:** on first login its PBKDF2-SHA256 hash (random salt) is lazily written to D1; only the hash is stored thereafter.
- In admin mode every note card (including search results) shows **delete / pin** actions; a **change-password** FAB appears next to the theme button (a modal, no separate page).
- Sessions: login returns a Bearer token (D1 `admin_sessions`, 7-day expiry); 5 failed attempts lock the IP for 10 minutes.
- Changing the password requires the current password + a new one (4–128 chars); other sessions are revoked while the current one stays alive.

> This is a deliberately light "hidden backdoor" admin, not hardened against a determined public attacker. Change the default password immediately after deploying.

## Tests

```bash
pnpm test      # unit/integration suite (Vitest)
```

Coverage: embedding jitter/dropping statistics (same text ≠ 100%, sub-character probabilistic hits, unrelated words at noise level); BLS signing/verification including tamper detection; sealing cosine preservation and determinism; admin PBKDF2 password storage.

End-to-end smoke test (requires `pnpm db:migrate:local` and a running `pnpm dev`):

```bash
npx vitest run e2e/smoke.test.ts
```

## Project structure

```
src/
  main.tsx                  # Entry: fonts + global styles + App
  App.tsx                   # Shell: navbar + page outlet + FABs + title
  index.css                 # Design tokens (light/dark) + reset + form base styles
  router/                   # Tiny custom single-root router (pageId, clean URLs)
  pages/                    # Page views with co-located CSS
    HomeView                # Board: search + note stream (pinned first), post modal
    AboutView               # Cryptography explainer (article layout)
    NotFoundView            # 404
  components/               # Reusable components, each with co-located CSS
    Button / Reveal / ThemeToggle / BackLink / Badge / Modal / Toast
    NoteCard / CipherChip / NoteForm / SearchForm / VerifyModal
  hooks/useReducedMotion.ts # Motion preference
  lib/
    embed.ts                # Character n-gram feature hashing + jitter/drop (client)
    crypto.ts               # BLS12-381 signature-as-ciphertext (client)
    decrypt.ts              # Verification: BLS verify wrapper
    api.ts                  # fetch wrapper
    theme.ts                # data-theme persistence + system preference
    motion.ts               # useInView (IntersectionObserver)
  shared/constants.ts       # Constants shared by client and Worker
  worker/seal.ts            # Server-side signed-permutation sealing
  worker/seed.ts            # Lazy README seed note (idempotent)
  worker/index.ts           # Worker: /api routes + static assets
migrations/                 # Idempotent D1 migrations
```

## Limitations & roadmap

- Character n-grams only: pure semantic synonyms (`电话` ↔ `手机`) don't match. Semantic embeddings (e.g. `bge-small-zh-v1.5`) can be mixed in by changing only `embed.ts` and the Worker combination logic.
- Deletion currently lives only behind the hidden admin entry; note editing (PATCH) or IP-based posting moderation can be added on the same patterns.

## License

[MIT](./LICENSE)
