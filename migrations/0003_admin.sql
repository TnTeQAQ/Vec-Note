-- 隐藏管理入口：单行管理员配置（默认密码 admin，首次使用时由 Worker 惰性写入哈希）
CREATE TABLE IF NOT EXISTS admin_config (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,     -- pbkdf2$sha256$<iterations>$<salt>$<hash>
  updated_at    INTEGER NOT NULL
);

-- 登录会话：Bearer token → 过期时间（改密后撤销除当前外的会话）
CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- 登录失败锁定（按 IP）：连续失败达到上限后锁定一段时间
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip           TEXT PRIMARY KEY,
  failed       INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);
