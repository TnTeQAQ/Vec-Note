import Reveal from '../components/Reveal';
import BackLink from '../components/BackLink';
import './AboutView.css';

/**
 * 关于页：说明项目原理、技术栈与初衷。
 * 整页文字可选中复制（selectable）。
 */
export default function AboutView() {
  return (
    <div className="about selectable">
      <BackLink />
      <Reveal>
        <h1 className="about__title">关于 Vec-Note</h1>
        <p className="about__lede">
          Vec-Note 是一个留言 + 搜索应用，核心特性是：<strong>标题明文不离开浏览器、不入库、不进日志</strong>。
          服务端仅获得「公开向量 + 密文 + 内容」，即可完成检索与身份验证。
        </p>
      </Reveal>

      <Reveal delay={40}>
        <section className="about__block">
          <h2 className="about__h2">项目初衷</h2>
          <p className="about__p">
            常见留言板会将标题明文存入数据库，数据库泄露即导致所有标题暴露。Vec-Note
            在浏览器端将标题拆分为「用于检索的向量」与「用于验证的密文」，服务端只存储这两者的加工结果。
          </p>
          <p className="about__p">
            这一方案由 BLS12-381 签名、正交密封、特征哈希等真实密码学组件实现，是
            「签名/验签 + 密文不可反推标题」形态的完整演示。
          </p>
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="about__block">
          <h2 className="about__h2">数据流</h2>
          <ul className="about__list">
            <li><strong>发布</strong>：浏览器将标题向量化（embed）并签名（signTitle），仅上传 <code>内容 + 公开向量 + 密文</code>。</li>
            <li><strong>存储</strong>：Worker 使用服务端密钥 <code>VEC_SEAL_SECRET</code> 对向量做「签名置换密封」后落库。</li>
            <li><strong>搜索</strong>：查询词向量化后由 Worker 密封，按余弦相似度召回高于 5% 阈值的候选，分页返回 <code>total / hasMore</code>。</li>
            <li><strong>验证</strong>：将密文复制到「实验台」输入候选标题，BLS 验签通过即「验证成功」。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="about__block">
          <h2 className="about__h2">实现要点</h2>

          <h3 className="about__h3">1. 标题向量化</h3>
          <p className="about__p">
            标题规范化后取全部单字与相邻双字（字符 n-gram），经 FNV-1a 哈希映射到 1024 维并做 L2
            归一化。该向量仅用于检索相似候选，不负责验证标题身份。
          </p>
          <p className="about__p">
            采用 n-gram 的原因是<strong>计算开销低</strong>：仅涉及哈希与计数，无模型推理与矩阵运算，
            浏览器本地即可毫秒级完成，服务端也只做点积比较。代价是仅支持字符级重叠匹配，不含语义关联。
          </p>
          <ul className="about__list">
            <li><strong>高斯抖动（σ=0.35）</strong>：同一标题两次嵌入的余弦期望约为 89%，避免精确命中达到 100%。</li>
            <li><strong>存储侧随机丢弃（保留率 70%）</strong>：词项入库时随机取舍，单字查询的命中呈概率性。</li>
          </ul>
          <p className="about__p">
            引入抖动主要针对<strong>数据库被拖走</strong>的场景：攻击者结合公开算法对向量做字典反推时，
            若同词余弦恒为 1，命中即构成确证。抖动使精确命中无法达到 100%，削弱了这一确证信号；
            同时每次嵌入结果不同，单条向量无法直接还原明文特征。
          </p>
          <p className="about__p">
            主要防线仍是<strong>服务端密封</strong>：缺少密钥时无法将向量维度对应到具体字符，字典反推
            缺乏入口；抖动作为补充，进一步降低反推的可信度。
          </p>

          <h3 className="about__h3">2. 签名即密文（BLS12-381）</h3>
          <p className="about__p">
            私钥种子为字符串 <code>解密成功</code>：<code>sk = SHA-256("解密成功") mod r</code>（r 为
            BLS12-381 标量域阶），公钥 <code>pk = sk·G</code>。「密文」即标题的 BLS 签名（96 字节，
            base64url 编码）。
          </p>
          <ul className="about__list">
            <li>签名是<strong>确定性</strong>的：同一标题始终得到同一密文。</li>
            <li>「验证成功」= 公钥 + 候选明文 + 密文验签通过；<strong>标题明文无法由签名反推</strong>。</li>
            <li>BLS12-381 是与零知识证明（Groth16 等）同族的配对友好曲线。</li>
          </ul>

          <h3 className="about__h3">3. 服务端密封（签名置换）</h3>
          <p className="about__p">
            字符 n-gram 的字符集有限，公开哈希直接落库可能被字典穷举反推。Worker 使用仅服务端持有的
            密钥生成「签名置换」（随机置换 + 每维 ±1 的正交矩阵）密封向量：
          </p>
          <ul className="about__list">
            <li>正交变换<strong>精确保持余弦相似度</strong>，检索排序不变；</li>
            <li>「字符 → 哈希桶」映射被密钥打乱，缺少密钥时无法由 <code>sealed_vector</code> 反推字符；</li>
            <li>API 永不返回向量字段，仅返回相似度排序结果。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={100}>
        <section className="about__block">
          <h2 className="about__h2">边界与限制</h2>
          <ul className="about__list">
            <li>纯前端项目的「私钥」随 JS 下发：不具备对代码阅读者的保密性，仅演示<strong>「标题明文不离浏览器、不可反推」</strong>。</li>
            <li>仅字符 n-gram：语义近义词没有命中。</li>
            <li>剩余泄漏：可观察词项数量的量级（约等于标题长度量级）。</li>
            <li>随机抖动使单字查询命中带随机性，同一标题的相似度约为 89% 而非 100%。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="about__block">
          <h2 className="about__h2">技术栈</h2>
          <p className="about__p">
            前端 React 19 + Vite + TypeScript（向量化、签名均在浏览器完成）；
            后端 Cloudflare Workers + D1；加密 <code>@noble/curves</code>（BLS12-381）与{' '}
            <code>@noble/hashes</code>（SHA-256）；无限滚动 react-intersection-observer。
          </p>
        </section>
      </Reveal>
    </div>
  );
}