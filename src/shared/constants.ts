// 客户端与 Worker 共用的常量（单一事实来源）。
export const VECTOR_DIM = 1024;
export const LIST_LIMIT = 20;
// 留言内容上限（后端强制校验）：
// 约可容纳一篇小型文章（参考 11.9k 字符的博客长文），单条 ≈16KB，对 D1 无压力
export const CONTENT_MAX_LENGTH = 16000;
// 低于该余弦的重叠视为噪声级，不作为搜索候选返回
export const SIMILARITY_EPSILON = 0.3;
// 候选结果必须与查询至少共享多少个「显著 n-gram 哈希槽位」。
// 由于密封是带符号置换，槽位位置和符号方向都被保留，可直接在密封向量上比较。
export const MIN_SHARED_SLOTS = 1;
// 判定“显著槽位”的绝对值下限：信号槽通常明显大于密集噪声分量。
// 低于该值的分量视为噪声，不参与共享槽位计数。
export const SHARED_SLOT_ABS_MIN = 0.05;
// 存储模式下每个 n-gram 词项被保留的概率（1 - 丢弃率）：
// 子字检索因此呈概率性命中（约等于该值）
export const TERM_KEEP_PROBABILITY = 0.7;
// 每次嵌入注入的高斯抖动相对强度：
// 同一文本两次嵌入的余弦期望 ≈ 1/(1+σ²)，永不达到 100%
export const EMBED_NOISE_SIGMA = 0.35;
