-- 限流放宽：同一 IP 由「每分钟 1 条」改为「每分钟最多 5 条」，采用固定窗口计数。
-- last_post_at 保留（记录最近一次发送时间）；窗口起点 + 计数为新字段。
ALTER TABLE rate_limits ADD COLUMN window_started_at INTEGER;
ALTER TABLE rate_limits ADD COLUMN post_count INTEGER NOT NULL DEFAULT 0;
