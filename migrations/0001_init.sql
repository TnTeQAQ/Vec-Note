-- 标题明文永不入库：只有 sealed_vector（密钥化密封后的 n-gram 向量）与 title_ct（BLS 密文）。
CREATE TABLE IF NOT EXISTS notes (
  id            TEXT PRIMARY KEY,     -- crypto.randomUUID()
  created_at    INTEGER NOT NULL,     -- Date.now() 毫秒
  content       TEXT NOT NULL,        -- 内容（明文，需求如此，用于结果展示）
  sealed_vector TEXT NOT NULL,        -- seal(公开 ngram 向量) 的 JSON 数组字符串
  title_ct      TEXT NOT NULL         -- BLS12-381 签名 base64url，即“密文”
);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);