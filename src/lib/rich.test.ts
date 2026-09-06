/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderRichText } from './rich';

describe('renderRichText（Markdown → 安全 HTML）', () => {
  it('渲染粗体/斜体/代码等基础 Markdown', () => {
    const html = renderRichText('**加粗** 与 `code`');
    expect(html).toContain('<strong>');
    expect(html).toContain('加粗');
    expect(html).toContain('<code>');
  });

  it('放行 http(s) 图片（markdown 语法）', () => {
    const html = renderRichText('![示例](https://example.com/a.png)');
    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/a.png"');
  });

  it('放行内联位图 data:image/png', () => {
    const html = renderRichText('<img src="data:image/png;base64,iVBORw0KGgo=" alt="x">');
    expect(html).toContain('data:image/png');
  });

  it('拒绝 data:application/pdf 等任意文件', () => {
    const html = renderRichText('<img src="data:application/pdf;base64,AAAA" alt="x">');
    expect(html).not.toContain('src=');
    expect(html).not.toContain('pdf');
  });

  it('拒绝 pdf/svg 等扩展名的远程图片', () => {
    expect(renderRichText('![x](https://example.com/a.pdf)')).not.toContain('src=');
    expect(renderRichText('![x](https://example.com/a.svg)')).not.toContain('src=');
    expect(renderRichText('<img src="https://example.com/a.zip">')).not.toContain('src=');
    // 无扩展名或位图扩展名仍放行
    expect(renderRichText('![x](https://picsum.photos/id/1/800/500)')).toContain('img');
  });

  it('剥离脚本与事件属性', () => {
    const html = renderRichText('<script>alert(1)</script><img src=x onerror="alert(2)">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('拒绝 javascript: 链接与按钮', () => {
    const html = renderRichText('<button onclick="x()">点我</button> [x](javascript:alert(1))');
    expect(html).not.toContain('<button');
    // javascript: 链接不会被渲染成 <a>（markdown-it 校验协议 + DOMPurify 双保险）
    expect(html).not.toContain('href=');
    expect(html).not.toContain('<a');
  });

  it('保留 span 字体颜色，仅限颜色属性', () => {
    const html = renderRichText('<span style="color:red;position:fixed">红</span>');
    expect(html).toContain('color: red');
    expect(html).not.toContain('position');
  });
});
