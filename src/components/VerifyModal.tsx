import { useState } from 'react';
import { decryptTitle } from '../lib/decrypt';
import Modal from './Modal';
import Button from './Button';
import { useToast } from './Toast';
import './VerifyModal.css';

/**
 * 解密核查弹窗：密文由留言卡片带入（只读展示），用户仅需输入候选标题明文，
 * 点「核查」后结果以顶部 toast 提示（成功/失败），可反复尝试。
 */
export default function VerifyModal({
  open,
  cipher,
  onClose,
}: {
  open: boolean;
  cipher: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const { toast } = useToast();

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const { ok } = decryptTitle(cipher, t);
    toast(ok ? '验证成功' : '验证失败', ok ? 'success' : 'error');
  }

  return (
    <Modal open={open} title="解密核查" onClose={onClose}>
      <form className="verify-modal" onSubmit={handleVerify}>
        <label className="field-label" htmlFor="verify-modal-cipher">
          密文
        </label>
        <div className="verify-modal__cipher" id="verify-modal-cipher">
          {cipher}
        </div>
        <label className="field-label" htmlFor="verify-modal-title">
          标题明文
        </label>
        <input
          className="field"
          id="verify-modal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入标题明文"
          autoComplete="off"
          autoFocus
        />
        <div className="verify-modal__actions">
          <Button type="submit" variant="solid" disabled={!title.trim()}>
            核查
          </Button>
        </div>
      </form>
    </Modal>
  );
}
