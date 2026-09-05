/** FNV-1a → 0..359 色相：为任意字符串生成稳定的标识颜色。 */
export function textHue(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 360;
}
