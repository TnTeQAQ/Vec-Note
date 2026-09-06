import Reveal from '../components/Reveal';
import BackLink from '../components/BackLink';
import './AboutView.css';

/**
 * 关于页：项目原理与技术栈。整页文字可选中复制。
 */
export default function AboutView() {
  return (
    <div className="about selectable">
      <BackLink />
      <Reveal>
        <h1 className="about__title">关于 Vec-Note</h1>
        <p className="about__lede">
          Vec-Note 是留言 + 搜索应用。<strong>标题明文不入库、不进日志</strong>，
          服务端仅持有「公开向量 + 密文 + 内容」，仍可完成检索与验证。
        </p>
      </Reveal>

      <Reveal delay={40}>
        <section className="about__block">
          <h2 className="about__h2">开源</h2>
          <p className="about__p">
            项目完整源码托管在 GitHub，欢迎 Star 与 Issue：
          </p>
          <p className="about__p">
            <a
              className="about__repo"
              href="https://github.com/TnTeQAQ/Vec-Note"
              target="_blank"
              rel="noreferrer noopener"
            >
              github.com/TnTeQAQ/Vec-Note ↗
            </a>
          </p>
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="about__block">
          <h2 className="about__h2">初衷</h2>
          <p className="about__p">
            传统留言板标题明文入库，数据库泄露即全量暴露。本项目在浏览器端把标题拆成
            「检索向量」与「验证密文」，只存加工结果，实现「签名/验签 + 密文不可反推标题」的演示。
          </p>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="about__block">
          <h2 className="about__h2">数据流</h2>
          <ul className="about__list">
            <li><strong>发布</strong>：浏览器向量化（embed）+ 签名（signTitle），上传 <code>内容 + 公开向量 + 密文</code>。</li>
            <li><strong>存储</strong>：Worker 用 <code>VEC_SEAL_SECRET</code> 密封向量后落库。</li>
            <li><strong>搜索</strong>：查询词向量化 → 密封 → 余弦相似度召回（阈值 5%），分页返回。</li>
            <li><strong>验证</strong>：密文 + 候选标题在核查弹窗做 BLS 验签。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={100}>
        <section className="about__block">
          <h2 className="about__h2">实现要点</h2>

          <h3 className="about__h3">向量化</h3>
          <p className="about__p">
            字符 n-gram（单字 + 双字）→ FNV-1a 哈希到 1024 维 → L2 归一化。仅哈希计数，
            无模型推理，浏览器毫秒级完成；代价是无语义关联。
          </p>
          <ul className="about__list">
            <li><strong>高斯抖动（σ=0.35）</strong>：同词余弦约 89%，永不 100%。防止数据库泄露后
              字典反推得到「完全一致」的确证信号；主要防线仍为服务端密封。</li>
            <li><strong>存储侧随机丢弃（70%）</strong>：词项入库随机取舍，单字查询命中呈概率性。</li>
          </ul>

          <h3 className="about__h3">签名即密文（BLS12-381）</h3>
          <p className="about__p">
            种子 <code>解密成功</code> → <code>sk = SHA-256(seed) mod r</code> → 公钥
            <code>pk = sk·G</code>。「密文」即标题的 BLS 签名（96 字节）。签名确定、验签即验证、
            明文不可反推。
          </p>

          <h3 className="about__h3">服务端密封（签名置换）</h3>
          <p className="about__p">
            服务端密钥生成「随机置换 + 每维 ±1」的正交矩阵，密封向量：精确保持余弦、
            打乱「字符 → 哈希桶」映射，使数据库中的 <code>sealed_vector</code> 无法反推字符。
            API 永不返回向量字段。
          </p>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="about__block">
          <h2 className="about__h2">限制</h2>
          <ul className="about__list">
            <li>前端「私钥」随 JS 下发，仅演示「标题不可反推」，不对浏览代码者保密。</li>
            <li>仅字符 n-gram，无语义近义。</li>
            <li>可观察词项数量级（≈ 标题长度量级）。</li>
            <li>随机抖动使同词相似度约 89%，单字命中带概率。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="about__block">
          <h2 className="about__h2">技术栈</h2>
          <ul className="about__list">
            <li><strong>前端</strong>：React 19 + Vite + TypeScript</li>
            <li><strong>后端 / 数据库</strong>：Cloudflare Workers + D1</li>
            <li><strong>加密</strong>：<code>@noble/curves</code>（BLS12-381）、<code>@noble/hashes</code>（SHA-256）</li>
            <li><strong>无限滚动</strong>：react-intersection-observer</li>
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
