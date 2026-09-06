// 客户端与 Worker 共用的常量（单一事实来源）。
export const VECTOR_DIM = 1024;
export const LIST_LIMIT = 20;
// 留言内容上限（后端强制校验）
export const CONTENT_MAX_LENGTH = 500;
// 低于该余弦的重叠视为噪声级，不作为搜索候选返回
export const SIMILARITY_EPSILON = 0.05;
// 存储模式下每个 n-gram 词项被保留的概率（1 - 丢弃率）：
// 子字检索因此呈概率性命中（约等于该值）
export const TERM_KEEP_PROBABILITY = 0.7;
// 每次嵌入注入的高斯抖动相对强度：
// 同一文本两次嵌入的余弦期望 ≈ 1/(1+σ²)，永不达到 100%
export const EMBED_NOISE_SIGMA = 0.35;
