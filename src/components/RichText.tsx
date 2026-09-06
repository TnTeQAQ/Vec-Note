import { useMemo } from 'react';
import { renderRichText } from '../lib/rich';
import './RichText.css';

/**
 * 把 Markdown 留言渲染为净化后的安全 HTML。
 * 显示层（列表）通过 clamp 裁剪；详情弹窗用完整版。
 */
export default function RichText({ markdown }: { markdown: string }) {
  const html = useMemo(() => renderRichText(markdown), [markdown]);
  return <div className="rich" dangerouslySetInnerHTML={{ __html: html }} />;
}
