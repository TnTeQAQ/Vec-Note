// FNV-1a 32 位哈希。
function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * 把色相限制在「清新带」：[0, 25) 红/珊瑚系 + [130, 360) 绿/青/蓝/紫/粉系，
 * 完全跳过黄、橄榄、棕等土糊区间（≈25°–130°）。
 */
function freshHue(seed: number): number {
  const span = 25 + (360 - 130); // 总可染色相长度
  const r = seed % span;
  return r < 25 ? r : 130 + (r - 25);
}

/**
 * 密文的稳定标识色（清新向）：高饱和、适中明度，亮/暗主题都清晰。
 */
export function cipherColor(text: string): string {
  const hue = freshHue(fnv1a32(text));
  return `hsl(${hue} 80% 52%)`;
}
