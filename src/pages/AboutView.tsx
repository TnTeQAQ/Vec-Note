import Reveal from '../components/Reveal';
import './AboutView.css';

/**
 * 关于页：把项目的密码学说明整理成文章式排版（参考 blog_site 的 PostView）。
 */
export default function AboutView() {
  return (
    <div className="about">
      <Reveal>
        <h1 className="about__title">关于 Vec-Note</h1>
        <p className="about__lede">
          一个简约风的留言 + 搜索应用：<strong>标题明文从不离开浏览器、从不入库</strong>。
          标题被向量化（字符 n-gram）用于近似检索，被 BLS12-381 签名（作为「密文」）用于唯一验证；
          Worker 用一个服务端密钥对向量做「签名置换」密封，使数据库里的向量无法反推标题。
        </p>
      </Reveal>

      <Reveal delay={60}>
        <section className="about__block">
          <h2 className="about__h2">签名即密文（BLS12-381）</h2>
          <ul className="about__list">
            <li>
              私钥种子 = 字符串 <code>解密成功</code>：<code>sk = SHA-256("解密成功") mod r</code>
              （<code>r</code> 为 BLS12-381 标量域阶），<code>pk = sk·G</code>。
            </li>
            <li>
              「密文」= 对标题的 BLS 签名（96 字节 → base64url）。
            </li>
            <li>
              「验证成功」= 用公钥 + 候选明文 + 密文验签通过。标题明文不可从签名反推。
            </li>
            <li>BLS12-381 是与零知识证明（Groth16 等）同族的配对友好曲线。</li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={90}>
        <section className="about__block">
          <h2 className="about__h2">向量不可反推（签名置换密封）</h2>
          <p className="about__p">
            字符 n-gram 的字母表很小（常用字仅数千），若直接用公开哈希落库，
            攻击者可对字典逐个哈希反推字符。因此 Worker 用一个仅服务端持有的密钥生成
            「签名置换」（随机置换 + 每维 ±1，正交矩阵）密封向量：
          </p>
          <ul className="about__list">
            <li>正交变换<strong>精确保持余弦相似度</strong>，密封不改变检索排序；</li>
            <li>
              每次嵌入注入相对强度 σ=0.35 的高斯抖动：同一文本两次嵌入的余弦期望 ≈
              1/(1+σ²) ≈ 89%，同词检索<strong>不会达到 100%</strong>；
            </li>
            <li>
              存储侧按 70% 概率随机保留 n-gram 词项：搜「手」「机」这类子字
              <strong>有可能命中、也有可能不命中</strong>；
            </li>
            <li>无关词只剩噪声级重叠，Worker 按 5% 相似度阈值过滤后不会返回；</li>
            <li>
              「字符→哈希桶」的位置映射被密钥打乱，无密钥无法从 <code>sealed_vector</code>{' '}
              反推字符；API 返回匹配度百分比，但<strong>永不返回向量字段</strong>。
            </li>
            <li>
              剩余泄漏：可观察到「词项个数/幅度直方图」（≈ 标题规范化后的词项数量级）。
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="about__block">
          <h2 className="about__h2">已知演示限制</h2>
          <p className="about__p">
            纯前端项目的「私钥」随 JS 下发，因此这不是对浏览代码者的保密，
            而是对「非对称签名/验签 + 密文不可反推标题」这一形态的演示。
            真正达成的隐私目标是：<strong>标题明文从未离开浏览器、不入库、不进日志</strong>。
          </p>
          <p className="about__p">
            仅字符 n-gram：纯语义近义（「电话」↔「手机」）不命中。
            如需语义，可平滑升级为混合方案（引入 <code>bge-small-zh-v1.5</code> 语义向量，
            仅改 <code>embed.ts</code> 与 Worker 组合逻辑）。
          </p>
        </section>
      </Reveal>

      <Reveal delay={150}>
        <section className="about__block">
          <h2 className="about__h2">技术栈</h2>
          <p className="about__p">
            前端 React + Vite + TypeScript（向量化与加/解密都在浏览器完成）；
            后端 Cloudflare Workers（静态托管 + <code>/api</code>）；
            数据库 Cloudflare D1；加密 <code>@noble/curves</code> BLS12-381。
          </p>
        </section>
      </Reveal>
    </div>
  );
}
