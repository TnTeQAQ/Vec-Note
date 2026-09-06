# Vec-Note · 向量留言板

一个简约风的留言 + 搜索应用：**标题明文从不离开浏览器、从不入库**。标题被向量化（字符 n-gram）用于近似检索，被 BLS12-381 签名（作为「密文」）用于唯一验证；Worker 用一个服务端密钥对向量做「签名置换」密封，使数据库里的向量无法反推标题。

- 前端：React + Vite + TypeScript（**纯前端**：向量化与加/解密都在浏览器完成）
- 后端：Cloudflare Workers（静态托管 + `/api`）
- 数据库：Cloudflare D1
- 加密：`@noble/curves` BLS12-381

## 隐藏管理入口（长按 10 秒）

主题切换按钮 **按住 10 秒不放** 会进入密码验证（无动画，不切换主题），用于删除留言与管理密码：

- **默认密码 `admin`**：首次登录时在 D1 中惰性写入其 PBKDF2-SHA256 哈希（随机盐），之后只存哈希、不存明文；
- 登录成功进入「管理模式」：首页每张留言卡（含搜索结果）出现 **删除** 入口；右下角主题按钮旁多出 **修改密码** 浮标（弹窗内完成，无独立页面）；
- 会话：登录返回 Bearer token（D1 `admin_sessions`，7 天过期）；连续输错 5 次锁定该 IP 10 分钟；
- 修改密码需当前密码 + 新密码（4–128 位），成功后撤销其它会话、保留当前会话。

> 安全提示：这是「隐藏后门」式的轻量管理，不面向公网强对抗；默认密码请登录后尽快修改。

## 工作流

1. **留言**：输入标题 + 内容 → 浏览器对标题做 `embed()` 向量化（含随机抖动；存储侧随机丢弃词项）与 `signTitle()` 签名 → 只上传 `内容 + 公开向量 + 密文`。
2. **存储**：Worker 用 `VEC_SEAL_SECRET` 把公开向量密封成 `sealed_vector` 落库；`title_ct` 是密文；`content` 明文。
3. **搜索**：浏览器对查询词向量化 → Worker 密封后按余弦相似度召回**全部**高于 30% 阈值且至少共享一个 n-gram 哈希槽位的候选（按相似度排序，返回 `密文 + 内容 + 匹配度`，不返回相似度原始分数与向量）→ **应用不做自动验证**：留言卡片上点「去验证」弹出核查窗口，输入候选标题明文手动核查，BLS 验签通过即「✓ 验证成功」。

对照示例（提交标题「手机」、内容「测试内容」）：
- 搜「手机」→ 命中，相似度约 89%（抖动使同词检索永不达到 100%）。
- 搜「手」→ 有可能命中（约七成概率：共享字符 + 存储侧随机丢弃词项），命中后可在核查弹窗验证密文。
- 搜「电话」→ 不命中（无共享字符，只剩噪声级重叠，低于 30% 相似度阈值且无共享槽位）。

## 初始数据（README 示例留言）

数据库第一次被访问时（首页列表或首次搜索），Worker 会自动种入一条标题为 **README** 的示例留言（固定 ID `8f3a2c1d-4e5f-4a9b-8c7d-2e3f4a5b6c7d`，幂等，只种一条）：

- 内容是一条快速上手简介：点卡片「去验证」输入 `README` → 「验证成功」；搜索 `README` 也能搜到这条；
- 密文是 `signTitle('README')` 的确定性输出（BLS12-381 签名，base64url）；密封向量在运行时用真实 `VEC_SEAL_SECRET` 计算——SQL 迁移无法预知部署环境的密钥，故初始化放在 Worker 代码里；
- 实现见 `src/worker/seed.ts`，行为测试见 `src/worker/seed.test.ts`。

## 目录结构

前端参考 blog_site 的模块化切分：自研单根路由（pageId）+ 页面视图 + 组件级同名 CSS。

```
src/
  main.tsx                  # 入口：字体 + 全局样式 + App
  App.tsx                   # Shell：NavBar + 页面出口 + 主题 FAB + 标题
  index.css                 # 设计变量（亮/暗主题）+ reset + 表单基础样式
  router/
    context.ts              # PageState / usePageRouter
    router.tsx              # history.pushState + localStorage 恢复（URL 保持干净）
    pages.tsx               # 页面注册表：renderPage / getPageTitle
  pages/                    # 页面视图（每页同名 CSS）
    HomeView                # 论坛主页：搜索 + 留言流（按时间排序）；发布用弹窗表单
    AboutView               # 密码学说明（文章式排版）
    NotFoundView            # 404
  components/               # 复用组件（每个组件同名 CSS）
    Button / Reveal / ThemeToggle / BackLink / SectionHead / Badge
    NoteCard / CipherChip / NoteForm / SearchForm / VerifyModal   # 解密核查走弹窗
    PageReveal / page-reveal-context   # 点击导航 seam
  hooks/useReducedMotion.ts # 动效降级
  lib/
    embed.ts                # 字符 n-gram 特征哈希 + 随机抖动/丢弃（前端）
    crypto.ts               # BLS12-381 签名即密文（前端）
    decrypt.ts              # 「验证」模块：BLS 验签封装
    api.ts                  # fetch 封装
    theme.ts                # data-theme 持久化 + 动态 favicon
    motion.ts               # useInView（IntersectionObserver）
  shared/constants.ts       # 客户端 + Worker 共用常量
  worker/seal.ts            # 服务端「签名置换」密封（保持余弦、不可反推）
  worker/seed.ts            # 初始化：README 示例留言（惰性种入，幂等）
  worker/index.ts           # Worker：/api 路由 + 静态资产
migrations/0001_init.sql    # D1 建表
```

## 密码学说明

### 签名即密文（BLS12-381）
- 私钥种子 = 字符串 `解密成功`：`sk = SHA-256("解密成功") mod r`（`r` 为 BLS12-381 标量域阶），`pk = sk·G`。
- 「密文」= 对标题的 BLS 签名（96 字节 → base64url，即示例里 `asdf1212e` 形态）。
- 「验证成功」= 用公钥 + 候选明文 + 密文验签通过。标题明文不可从签名反推。
- BLS12-381 是与零知识证明（Groth16 等）同族的配对友好曲线。

> **已知演示限制**：纯前端项目的「私钥」随 JS 下发，因此这不是对浏览代码者的保密，而是对「非对称签名/验签 + 密文不可反推标题」这一形态的演示。真正达成的隐私目标是：**标题明文从未离开浏览器、不入库、不进日志**。

### 向量不可反推（签名置换密封）
字符 n-gram 的字母表很小（常用字仅数千），若直接用公开哈希落库，攻击者可对字典逐个哈希反推字符。因此 Worker 用一个仅服务端持有的密钥生成「签名置换」（随机置换 + 每维 ±1，正交矩阵）密封向量：

- 正交变换**精确保持余弦相似度**，密封不改变检索排序；
- 「字符→哈希桶」的位置映射被密钥打乱，无密钥无法从 `sealed_vector` 反推字符；
- **随机抖动 + 存储侧词项丢弃**：每次嵌入注入相对强度 σ=0.35 的高斯噪声（同词两次嵌入余弦期望 ≈ 89%，永不 100%）；存储侧按 70% 概率保留词项（子字检索呈概率性命中）。无关词重叠只剩噪声级，由 Worker 的 30% 相似度阈值 + 至少一个共享槽位过滤；
- API 返回匹配度百分比，但永不返回向量字段。
- 剩余泄漏：可观察到「词项个数/幅度直方图」（≈ 标题规范化后的词项数量级）。

## 本地开发

```bash
pnpm install
pnpm db:migrate:local      # 应用 D1 迁移到本地
pnpm dev                   # vite build && wrangler dev（需 .dev.vars 提供 VEC_SEAL_SECRET）
```

然后打开 `http://localhost:8787`（以 wrangler 输出为准）。

## 部署

```bash
pnpm db:create             # wrangler d1 create vec-note；把输出的 database_id 填进 wrangler.jsonc
pnpm db:migrate:remote
wrangler secret put VEC_SEAL_SECRET   # 32+ 字节随机串，仅服务端持有
pnpm deploy                # vite build && wrangler deploy
```

部署需要先 `wrangler login` 或注入 `CLOUDFLARE_API_TOKEN`。

## 测试

```bash
pnpm test        # 单元测试（src/**）
```

覆盖：向量化的抖动/丢弃统计行为（同词不 100%、子字概率命中、无关词噪声级）；BLS 签名/验签（含篡改检测）；密封的余弦保持与确定性；管理密码 PBKDF2 哈希存取。

端到端冒烟（需先 `pnpm db:migrate:local` 并运行 `pnpm dev`）：

```bash
npx vitest run e2e/smoke.test.ts
```

## 取舍与后续

- 仅字符 n-gram：纯语义近义（「电话」↔「手机」）不命中。如需语义，可平滑升级为混合方案（引入 `bge-small-zh-v1.5` 语义向量，仅改 `embed.ts` 与 Worker 组合逻辑）。
- 留言删除目前只走「长按主题按钮 → 密码」的隐藏管理入口；如需要可再加 PATCH 编辑、按 IP 的发布审核等。
