-- IP 限流：同一 IP 每分钟最多发送一条留言。
CREATE TABLE IF NOT EXISTS rate_limits (
  ip           TEXT PRIMARY KEY,
  last_post_at INTEGER NOT NULL
);