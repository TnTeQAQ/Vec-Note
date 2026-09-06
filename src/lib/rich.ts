import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// ---- Markdown → HTML（允许少量原生 HTML，随后经白名单净化）----
const md = new MarkdownIt({
  html: true, // 允许 <span style=color>/<font color> 等；安全由 DOMPurify 白名单兜底
  breaks: true, // 换行即 <br>，留言内容不用写两个空格
  linkify: false,
});

// ---- XSS 白名单净化 ----
const ALLOWED_TAGS = [
  // 行内样式
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'code', 'span', 'font', 'br',
  // 块级结构
  'p', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'hr', 'pre',
  // 链接（http(s)/mailto，由 DOMPurify 默认协议白名单把关）
  'a',
  // 图片（src 在下方的 hook 里二次校验）
  'img',
];
const ALLOWED_ATTR = ['style', 'color', 'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height'];

// 样式只保留颜色类属性，其余一律丢弃
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color']);
const UNSAFE_STYLE = /url\s*\(|expression\s*\(|javascript:|@import/i;

// 图片只允许 http(s) 与内联位图（png/jpeg/gif/webp/avif/bmp）；
// 拒绝 pdf/svg/zip 等任意文件，杜绝用图片语法塞非图片内容。
const RASTER_DATA = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);/i;
const NON_RASTER_EXT = /\.(?:pdf|svg|zip|rar|7z|tar|gz|exe|dmg|iso|js|mjs|css|html?|php|asp|json|xml|txt|md|mp4|webm|mov|mp3)$/i;
function isSafeImageSrc(src: string): boolean {
  if (/^(?:https?:)?\/\//i.test(src)) {
    // http(s)：路径尾部显式非位图扩展名一律拒绝
    const path = src.split(/[?#]/)[0] ?? '';
    return !NON_RASTER_EXT.test(path);
  }
  return RASTER_DATA.test(src);
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'SPAN' || node.tagName === 'FONT') {
    const raw = node.getAttribute('style');
    if (raw) {
      const keep: string[] = [];
      for (const piece of raw.split(';')) {
        const idx = piece.indexOf(':');
        if (idx === -1) continue;
        const prop = piece.slice(0, idx).trim().toLowerCase();
        const value = piece.slice(idx + 1).trim();
        if (ALLOWED_STYLE_PROPS.has(prop) && value && !UNSAFE_STYLE.test(value)) {
          keep.push(`${prop}: ${value}`);
        }
      }
      if (keep.length > 0) node.setAttribute('style', keep.join('; '));
      else node.removeAttribute('style');
    }
  }
  if (node.tagName === 'A') {
    // 外链新窗口打开且不带 opener 权限
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  if (node.tagName === 'IMG') {
    // 二次校验图片源：不安全的 src 直接摘掉（同时事件属性早已不在白名单内）
    const src = node.getAttribute('src') ?? '';
    if (!isSafeImageSrc(src)) node.removeAttribute('src');
  }
});

/**
 * 把用户留言内容渲染为「安全 HTML」：
 * 支持 Markdown + <b>/<i>/<u>/<s>/<code>/<pre>/列表/标题/链接/换行、
 * <span style="color:…"> 字体颜色，以及图片（http(s)/位图 data:）；
 * 脚本、事件属性、按钮/表单/iframe、pdf/svg 等一律剔除。
 */
export function renderRichText(markdown: string): string {
  const html = md.render(markdown);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
