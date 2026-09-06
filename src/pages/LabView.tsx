import Reveal from '../components/Reveal';
import BackLink from '../components/BackLink';
import VerifyPanel from '../components/VerifyPanel';
import './LabView.css';

/** 解密实验台：手动核查密文。原理说明见「关于」页。 */
export default function LabView() {
  return (
    <div className="lab">
      <BackLink />
      <Reveal>
        <h1 className="lab__title">解密实验台</h1>
      </Reveal>

      <Reveal delay={80} className="lab__panel">
        <VerifyPanel />
      </Reveal>
    </div>
  );
}
