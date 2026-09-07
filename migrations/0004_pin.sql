-- 置顶：pinned_at 非空即置顶（毫秒时间戳）；NULL 表示未置顶。
-- 本环境 SQLite 不支持 ADD COLUMN IF NOT EXISTS（< 3.35），采用裸 ALTER TABLE；
-- d1_migrations 表记录已应用迁移，保证该语句只执行一次（迁移级幂等）。
ALTER TABLE notes ADD COLUMN pinned_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_notes_pinned_at ON notes(pinned_at DESC);
