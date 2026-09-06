import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Modal from './Modal';
import Button from './Button';
import { useToast } from './Toast';
import {
  adminLogin,
  adminLogout,
  adminChangePassword,
  adminDeleteNote,
  type AdminSession,
} from '../lib/api';
import './AdminProvider.css';

const LS_KEY = 'vec-note:admin-session';

/** 长按主题按钮 10 秒进入；已登录时直接打开管理面板 */
type DialogKind = 'login' | 'panel' | null;

export interface AdminContextValue {
  /** 当前是否有有效会话（管理模式） */
  isAdmin: boolean;
  /** 打开入口：未登录 → 密码输入；已登录 → 修改密码面板 */
  openGate: () => void;
  closeDialog: () => void;
  /** 登录（错误会 throw） */
  login: (password: string) => Promise<void>;
  /** 退出管理模式 */
  logout: () => Promise<void>;
  /** 修改密码（错误会 throw） */
  changePassword: (current: string, next: string) => Promise<void>;
  /** 删除一条留言（错误会 throw） */
  deleteNote: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (typeof parsed?.token !== 'string' || typeof parsed?.expires_at !== 'number') return null;
    if (parsed.expires_at <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(loadSession);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const isAdmin = session !== null;

  useEffect(() => {
    try {
      if (session) localStorage.setItem(LS_KEY, JSON.stringify(session));
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [session]);

  const openGate = useCallback(() => {
    setError(null);
    setDialog(session ? 'panel' : 'login');
  }, [session]);

  const closeDialog = useCallback(() => {
    if (busy) return;
    setDialog(null);
    setError(null);
  }, [busy]);

  const login = useCallback(async (password: string) => {
    const s = await adminLogin(password);
    setSession(s);
    setDialog(null);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token;
    setSession(null);
    setDialog(null);
    setError(null);
    if (token) {
      try {
        await adminLogout(token);
      } catch {
        /* 服务端清理失败可忽略，本地已登出 */
      }
    }
  }, [session]);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!session) throw new Error('未登录');
      try {
        await adminChangePassword(session.token, current, next);
      } catch (err) {
        if ((err as { status?: number }).status === 401) {
          setSession(null); // 会话失效 → 退出管理模式
        }
        throw err;
      }
      // 服务端保留当前会话，仅撤销其它会话 → 无需换 token
    },
    [session],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!session) throw new Error('未登录');
      try {
        await adminDeleteNote(session.token, id);
      } catch (err) {
        if ((err as { status?: number }).status === 401) {
          // 会话失效 → 退出管理模式
          setSession(null);
        }
        throw err;
      }
    },
    [session],
  );

  /** 提交修改密码：成功/失败均弹 toast，成功后收起面板 */
  const submitChangePassword = async (current: string, next: string) => {
    setBusy(true);
    try {
      await changePassword(current.trim(), next);
      toast('密码已更新', 'success');
      setDialog(null);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        toast('登录已过期，请重新进入管理', 'error');
        setDialog(null);
      } else {
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<AdminContextValue>(
    () => ({ isAdmin, openGate, closeDialog, login, logout, changePassword, deleteNote }),
    [isAdmin, openGate, closeDialog, login, logout, changePassword, deleteNote],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}

      <Modal open={dialog === 'login'} title="管理员验证" onClose={closeDialog}>
        <LoginForm
          busy={busy}
          error={error}
          onSubmit={async (password) => {
            setBusy(true);
            setError(null);
            try {
              await login(password);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      </Modal>

      <Modal open={dialog === 'panel'} title="修改密码" onClose={closeDialog}>
        <ChangePasswordForm busy={busy} onSubmit={submitChangePassword} />
        <div className="admin-actions">
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            退出管理
          </Button>
        </div>
      </Modal>
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

function LoginForm({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    onSubmit(password);
  };

  return (
    <form onSubmit={submit} className="admin-form">
      <label className="field-label" htmlFor="admin-password">
        密码
      </label>
      <input
        className="field"
        id="admin-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="请输入管理密码"
        autoComplete="current-password"
        autoFocus
      />
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-actions">
        <Button type="submit" variant="solid" disabled={busy || !password}>
          {busy ? '验证中…' : '进入'}
        </Button>
      </div>
    </form>
  );
}

function ChangePasswordForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (current: string, next: string) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const valid = current && next && confirm && next === confirm && next.length >= 4;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return;
    onSubmit(current.trim(), next);
  };

  return (
    <form onSubmit={submit} className="admin-form">
      <label className="field-label" htmlFor="admin-current">
        当前密码
      </label>
      <input
        className="field"
        id="admin-current"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
      />

      <label className="field-label" htmlFor="admin-next">
        新密码
      </label>
      <input
        className="field"
        id="admin-next"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        placeholder="至少 4 位"
      />

      <label className="field-label" htmlFor="admin-confirm">
        确认新密码
      </label>
      <input
        className="field"
        id="admin-confirm"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      {next && confirm && next !== confirm ? (
        <p className="admin-error">两次输入的新密码不一致</p>
      ) : null}
      <div className="admin-actions">
        <Button type="submit" variant="solid" disabled={busy || !valid}>
          {busy ? '保存中…' : '保存新密码'}
        </Button>
      </div>
    </form>
  );
}
