import Reveal from '../components/Reveal';
import BackLink from '../components/BackLink';
import './AboutView.css';

/**
 * 关于页：按真实实现说明项目原理、技术栈与初衷。
 * 整页文字可选中复制（selectable）。
 */
export default function AboutView() {
  return (
    <div className="about selectable">
      <BackLink />
      <Reveal>
        <h1 className="about__title">关于 Vec-Note</h1>
        <p className="about__lede">
          Vec-Note 是一个留言 + 搜索的极简应用，核心主张只有一个：{' '}
          <strong>标题明文从不离开浏览器、从不入库、不进日志</strong>
          ——服务端拿到的只有「公开向量 + 密文 + 内容」，却仍然能完成搜索与“身份验证”。
        </p>
      </Reveal>

      <Reveal delay={40}>
        <section className="about__block">
          <h2 className="about__h2">项目初衷</h2>
          <p className="about__p">
            传统留言板的标题会以明文入库，管理员/数据库被拖走就能看到所有人的标题。Vec-Note
            想演示一种「可检索、可验证、但不可反推」的形态：让标题在浏览器端被加工成
            「找相似」用的向量和「验身份」用的密文，服务端只存加工产物。
          </p>
          <p className="about__p">
            这来自真实密码学组件（BLS12-381 签名、正交密封、哈希向量化）的组合，而不是玩具级
            base64 伪装——它是「签名/验签 + 密文不可反推标题」这一形态的完整演示。
          </p>
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="about__block">
          <h2 className="about__h2">一条留言的完整生命周期</h2>
          <ul className="about__list">
            <li><strong>发布</strong>：输入标题 + 内容 → 浏览器把标题本地向量化（embed）并签名（signTitle）→ 只上传 <code>内容 + 公开向量 + 密文</code>，标题明文不出浏览器。</li>
            <li><strong>存储</strong>：Worker 用服务端密钥 <code>VEC_SEAL_SECRET</code> 把公开向量「签名置换密封」后落库；密文与内容原样存。</li>
            <li><strong>搜索</strong>：查询词同样在浏览器向量化 → Worker 密封后按余弦相似度召回全部高于 5% 阈值的候选（分页返回 <code>total/hasMore</code>）。</li>
            <li><strong>验证</strong>：搜索结果不自动判定；用户复制密文到「实验台」，输入候选标题，BLS 验签通过才显示「验证成功」。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="about__block">
          <h2 className="about__h2">技术实现与目的</h2>

          <h3 className="about__h3">1. 标题向量化（前端 embed）</h3>
          <p className="about__p">
            标题规范化后取全部单字 + 相邻双字（字符 n-gram），用 FNV-1a 哈希分布到 1024
            维向量并 L2 归一化。该向量只负责“找相似”，不负责证明身份。
          </p>
          <ul className="about__list">
            <li><strong>高斯抖动（每次嵌入 σ=0.35）</strong>：同一标题两次嵌入的余弦期望 ≈ 1/(1+σ²) ≈ 89%，同词检索永不 100%——既避免“完全一致即等于标题泄漏”，也让结果更自然。</li>
            <li><strong>存储侧随机丢弃（70% 保留）</strong>：每个词项入库时随机取舍，搜「手」「机」这类子字是否命中呈概率性。</li>
            <li><strong>目的</strong>：在“能找相似”与“不暴露精确内容”之间取得平衡。</li>
          </ul>

          <h3 className="about__h3">2. 签名即密文（BLS12-381，@noble/curves）</h3>
          <p className="about__p">
            私钥种子 = 字符串 <code>解密成功</code>：<code>sk = SHA-256("解密成功") mod r</code>（r 为 BLS12-381
            标量域阶），公钥 <code>pk = sk·G</code> 内置在前端。「密文」就是标题的 BLS 签名
            （96 字节 → base64url）。
          </p>
          <ul className="about__list">
            <li>签名是<strong>确定性</strong>的：同一标题永远得到同一密文。</li>
            <li>「验证成功」= 用公钥 + 候选明文 + 密文验签通过；<strong>标题明文不可从签名反推</strong>。</li>
            <li>BLS12-381 是与零知识证明（Groth16 等）同族的配对友好曲线。</li>
          </ul>

          <h3 className="about__h3">3. 服务端密封（签名置换）</h3>
          <p className="about__p">
            字符 n-gram 的字母表很小，若直接用公开哈希落库，攻击者可对字典逐个哈希反推字符。
            因此 Worker 用仅服务端持有的密钥生成「签名置换」（随机置换 + 每维 ±1 的正交矩阵）密封向量：
          </p>
          <ul className="about__list">
            <li>正交变换<strong>精确保持余弦相似度</strong>，排序行为不变；</li>
            <li>「字符 → 哈希桶」映射被密钥打乱，无密钥无法从 <code>sealed_vector</code> 反推字符；</li>
            <li>API 永不返回向量字段（只返回相似度排名与匹配数）。</li>
          </ul>

          <h3 className="about__h3">4. 内容渲染与安全（Markdown + DOMPurify）</h3>
          <ul className="about__list">
            <li>内容明文存储，用 markdown-it 渲染，再经 DOMPurify <strong>白名单</strong>净化：允许粗斜体/列表/标题/代码/链接与 <code>&lt;span style=color&gt;</code> 字体颜色；</li>
            <li>图片仅允许 <code>http(s)</code> 与内联位图（png/jpeg/gif/webp/avif/bmp），拒绝 pdf/svg/zip 等任意文件；</li>
            <li><code>&lt;script&gt;</code>、事件属性、<code>javascript:</code>、按钮/表单/iframe 一律剔除。</li>
          </ul>

          <h3 className="about__h3">5. 工程细节</h3>
          <ul className="about__list">
            <li>自研 pageId 单页路由（history + localStorage 恢复，URL 保持干净）；</li>
            <li>留言流与搜索结果均为分页无限滚动（react-intersection-observer）；</li>
            <li>内容上限 16000 字符（后端强制校验）；</li>
            <li>同标题留言的密文相同 → 曾用于按密文分组展示（匿名“标题身份”聚类）。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={100}>
        <section className="about__block">
          <h2 className="about__h2">边界与已知限制</h2>
          <ul className="about__list">
            <li>纯前端项目的「私钥」随 JS 下发：这不是对浏览代码者的保密，而是对<strong>「标题明文不离浏览器、不可反推」</strong>这一目标的演示。</li>
            <li>仅字符 n-gram：纯语义近义（「电话」↔「手机」）不命中。</li>
            <li>剩余泄漏：可观察到词项数量级直方图（≈ 标题长度量级）。</li>
            <li>随机抖动使子字命中呈概率性，同词相似度约 89% 而非 100%（有意为之）。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="about__block">
          <h2 className="about__h2">技术栈</h2>
          <p className="about__p">
            前端 React 19 + Vite + TypeScript（向量化、签名、富文本渲染全部在浏览器）；
            后端 Cloudflare Workers + D1；加密 <code>@noble/curves</code>（BLS12-381）与{' '}
            <code>@noble/hashes</code>（SHA-256）；渲染 markdown-it + DOMPurify；
            无限滚动 react-intersection-observer。
          </p>
        </section>
      </Reveal>
    </div>
  );
}
