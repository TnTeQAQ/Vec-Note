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
          Vec-Note 是个留言 + 搜索的极简应用。它的主张很直接：<strong>标题明文从不离开浏览器、从不入库、不进日志</strong>
          。服务端手里只有「公开向量 + 密文 + 内容」，却照样能把搜索和“身份验证”跑起来。
        </p>
      </Reveal>

      <Reveal delay={40}>
        <section className="about__block">
          <h2 className="about__h2">项目初衷</h2>
          <p className="about__p">
            普通留言板把标题明文往库里一塞，库一被拖走，所有人的标题就全暴露了。Vec-Note
            想演示另一种形态：标题在浏览器里就被拆成「找相似用的向量」和「验身份用的密文」，
            服务端只存加工后的产物。
          </p>
          <p className="about__p">
            这套东西不是把 base64 包一层当加密糊弄人。它由 BLS12-381 签名、正交密封、哈希向量化这些真实组件拼起来，
            是对「签名/验签 + 密文不可反推标题」这一形态的完整演示。
          </p>
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="about__block">
          <h2 className="about__h2">一条留言走完的路</h2>
          <ul className="about__list">
            <li><strong>发布</strong>：输入标题和内容 → 浏览器把标题本地向量化（embed）、签名（signTitle）→ 只传 <code>内容 + 公开向量 + 密文</code>，标题明文不出浏览器。</li>
            <li><strong>存储</strong>：Worker 用服务端密钥 <code>VEC_SEAL_SECRET</code> 把向量「签名置换密封」后落库；密文、内容原样存。</li>
            <li><strong>搜索</strong>：查询词同样在浏览器向量化 → Worker 密封后按余弦相似度召回全部高于 5% 阈值的候选，分页返回 <code>total / hasMore</code>。</li>
            <li><strong>验证</strong>：搜索结果不自动下结论；复制密文到「实验台」输入候选标题，BLS 验签通过才显示「验证成功」。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="about__block">
          <h2 className="about__h2">具体怎么实现的</h2>

          <h3 className="about__h3">1. 标题向量化（前端 embed）</h3>
          <p className="about__p">
            标题规范化后取全部单字加相邻双字（字符 n-gram），用 FNV-1a 哈希铺到 1024 维，再 L2 归一化。
            这个向量只负责“找相似”，不负责证明身份。
          </p>
          <p className="about__p">
            选 n-gram 有个实在的好处：<strong>算起来便宜</strong>。它只是哈希和计数，没有模型推理、没有矩阵乘法，
            浏览器里毫秒级出结果，服务端也只做点积比较。相比之下，接一个语义 embedding 模型（BERT 那一类）
            要么在前端多扛几十 MB 的模型权重，要么在服务端多花推理开销——对这个应用来说是杀鸡用牛刀。
            付出的代价也明确：纯字符重叠，语义近义（「电话」↔「手机」）不命中。
          </p>
          <ul className="about__list">
            <li><strong>高斯抖动（每次嵌入 σ=0.35）</strong>：同一标题两次嵌入的余弦期望 ≈ 1/(1+σ²) ≈ 89%，同词检索永不 100%——既避免“完全一致即等于标题泄漏”，结果也更自然。</li>
            <li><strong>存储侧随机丢弃（70% 保留）</strong>：每个词项入库时随机取舍，搜「手」「机」这类子字是否命中就成了概率事件。</li>
          </ul>
          <p className="about__p">
            为什么要抖动，主要是防一种情况：<strong>数据库被人拖走</strong>。攻击者拿到的
            <code>sealed_vector</code> 加上公开的算法（n-gram + FNV + 维度），拿字典逐个试就能对
            每一条向量猜标题。如果同词余弦恒等于 1，猜中即实锤——那一刻泄漏就已经发生了。抖动让
            精确命中永远到不了 100%，等于把“确信无疑的命中信号”抹掉了；同时每次嵌入都不同，向量值本身
            带着噪声，没法从单条记录直接读出明文特征。
          </p>
          <p className="about__p">
            主防线其实是「服务端密封」：没有 <code>VEC_SEAL_SECRET</code>，连“第几维对应哪个字符”都
            对不上，字典反推根本无从下手。抖动是在这堵墙后面再补一刀，让即使密钥真丢了，反推也只能
            停留在“统计猜测”，而不是“直接读”。
          </p>

          <h3 className="about__h3">2. 签名即密文（BLS12-381，@noble/curves）</h3>
          <p className="about__p">
            私钥种子就是字符串 <code>解密成功</code>：<code>sk = SHA-256("解密成功") mod r</code>（r 是 BLS12-381
            标量域阶），公钥 <code>pk = sk·G</code> 写死在前端。「密文」就是标题的 BLS 签名
            （96 字节，base64url 编码）。
          </p>
          <ul className="about__list">
            <li>签名是<strong>确定性</strong>的：同一标题永远得到同一密文。</li>
            <li>「验证成功」= 公钥 + 候选明文 + 密文验签通过；<strong>标题明文不可从签名反推</strong>。</li>
            <li>BLS12-381 与零知识证明（Groth16 等）同族，是配对友好曲线。</li>
          </ul>

          <h3 className="about__h3">3. 服务端密封（签名置换）</h3>
          <p className="about__p">
            字符 n-gram 的字母表很小，公开哈希直接落库的话，拿字典逐个试就能反推。所以 Worker
            用一个只存在服务端的密钥生成「签名置换」（随机置换 + 每维 ±1 的正交矩阵）把向量封起来：
          </p>
          <ul className="about__list">
            <li>正交变换<strong>精确保持余弦相似度</strong>，排序不受影响；</li>
            <li>「字符 → 哈希桶」的映射被密钥打乱，没有密钥，从 <code>sealed_vector</code> 推不出字符；</li>
            <li>API 永不返回向量字段（只给相似度排名和匹配数）。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={100}>
        <section className="about__block">
          <h2 className="about__h2">边界与已知限制</h2>
          <ul className="about__list">
            <li>纯前端项目的「私钥」随 JS 下发。这不是对浏览代码的人保密，演示的是<strong>「标题明文不离浏览器、不可反推」</strong>这一条。</li>
            <li>只有字符 n-gram：语义近义不命中。</li>
            <li>剩余泄漏：能看出词项数量的量级（≈ 标题长度量级）。</li>
            <li>随机抖动让搜「手」这类子字时命中时而不命中，同一标题的相似度约 89% 而不是 100%。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="about__block">
          <h2 className="about__h2">技术栈</h2>
          <p className="about__p">
            前端 React 19 + Vite + TypeScript（向量化、签名全在浏览器）；
            后端 Cloudflare Workers + D1；加密 <code>@noble/curves</code>（BLS12-381）和{' '}
            <code>@noble/hashes</code>（SHA-256）；无限滚动 react-intersection-observer。
          </p>
        </section>
      </Reveal>
    </div>
  );
}
