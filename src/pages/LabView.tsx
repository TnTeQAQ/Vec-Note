import Reveal from '../components/Reveal';
import VerifyPanel from '../components/VerifyPanel';
import './LabView.css';

const PIPELINE = [
  {
    step: '01',
    title: '留言',
    body: '输入标题 + 内容 → 浏览器对标题做 embed() 向量化与 signTitle() 签名 → 只上传「内容 + 公开向量 + 密文」。',
  },
  {
    step: '02',
    title: '存储',
    body: 'Worker 用 VEC_SEAL_SECRET 把公开向量密封成 sealed_vector 落库；title_ct 是密文；content 明文。',
  },
  {
    step: '03',
    title: '搜索',
    body: '查询词向量化 → Worker 密封后按余弦相似度召回 Top-10 → 前端对每条结果 BLS 验签，通过则「解密成功」。',
  },
];

/** 解密实验台：手动核查密文 + 三步流水线说明。 */
export default function LabView() {
  return (
    <div className="lab">
      <Reveal>
        <h1 className="lab__title">解密实验台</h1>
        <p className="lab__subtitle">
          「解密」= 公钥 + 候选明文 + 密文验签通过。标题明文不可从签名反推——在这里亲手验证。
        </p>
      </Reveal>

      <Reveal delay={80} className="lab__panel">
        <VerifyPanel />
      </Reveal>

      <section className="lab__section">
        <Reveal>
          <h2 className="lab__section-title">数据流水线</h2>
        </Reveal>
        <div className="lab__steps">
          {PIPELINE.map((s, index) => (
            <Reveal key={s.step} delay={index * 70}>
              <div className="lab__step">
                <span className="lab__step-no">{s.step}</span>
                <h3 className="lab__step-title">{s.title}</h3>
                <p className="lab__step-body">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
