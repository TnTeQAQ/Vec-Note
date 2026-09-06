import { useAdmin } from './AdminProvider';

/**
 * 管理模式浮标：登录（进入管理）后出现在右下角主题按钮上方，
 * 点击打开管理面板（修改密码 / 退出）。未登录时不渲染。
 */
export default function AdminFab() {
  const { isAdmin, openGate } = useAdmin();
  if (!isAdmin) return null;

  return (
    <button
      type="button"
      className="fab-round admin-fab"
      onClick={openGate}
      title="修改密码 / 退出管理"
      aria-label="修改密码 / 退出管理"
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
      </svg>
    </button>
  );
}
