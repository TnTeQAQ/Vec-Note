// SEO 描述符：客户端（useSeo）与 Worker（HTML 注入）共用的单一事实来源。
// 本文件不得 import React / DOM 相关 API，Worker 也会直接打包它。

export const SITE_NAME = 'Vec-Note';
export const SITE_LOCALE = 'zh_CN';
export const SITE_LANG = 'zh-CN';
export const REPO_URL = 'https://github.com/TnTeQAQ/Vec-Note';

/** 文章类页面的修订日期（站点内容更新时同步修改） */
export const ARTICLE_DATE_MODIFIED = '2025-01-27';

export type SeoPageId = 'home' | 'about' | 'not-found';

export interface SeoDescriptor {
  /** 规范路径，首页为 '/' */
  path: '/' | '/about';
  /** 完整 <title> */
  title: string;
  /** meta description（中文 70–120 字） */
  description: string;
  /** Open Graph 类型 */
  ogType: 'website' | 'article';
  /** 该页对应的 JSON-LD 对象 */
  jsonLd: Record<string, unknown>;
}

/**
 * 生成与具体 origin 绑定的描述符（canonical / og:url / JSON-LD 需要绝对地址）。
 * origin 形如 https://notes.example.com（不带尾斜杠）。
 */
export function getSeoDescriptor(
  pageId: SeoPageId,
  origin: string,
): SeoDescriptor {
  if (pageId === 'about') {
    const url = `${origin}/about`;
    return {
      path: '/about',
      title: '关于 · Vec-Note — 加密向量留言板的原理与实现',
      description:
        'Vec-Note 如何在标题明文不入库的前提下完成检索与验证：浏览器端字符 n-gram 向量化、BLS12-381 签名即密文、服务端正交密封保持余弦相似度，基于 Cloudflare Workers 与 D1。',
      ogType: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: '关于 Vec-Note：加密向量留言板的原理与实现',
        description:
          '标题明文不入库的留言与搜索应用：字符 n-gram 向量检索、BLS12-381 签名即密文、服务端密封向量。',
        inLanguage: SITE_LANG,
        dateModified: ARTICLE_DATE_MODIFIED,
        author: { '@type': 'Person', name: 'tnteqaq', url: REPO_URL },
        publisher: { '@type': 'Person', name: 'tnteqaq' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        url,
        keywords:
          'BLS12-381, 向量检索, 余弦相似度, n-gram, Cloudflare Workers, D1, 隐私, 加密, 留言板',
      },
    };
  }

  // home（同时作为 not-found 的描述符兜底：未知路径仍返回首页默认 meta + 404 状态）
  const url = `${origin}/`;
  return {
    path: '/',
    title: 'Vec-Note · 向量留言板 — 标题明文不入库的加密留言与搜索',
    description:
      'Vec-Note 是一个隐私优先的向量留言板：标题在浏览器端拆成检索向量与 BLS12-381 密文，服务端只存加工结果仍可搜索与验证。开源、免费、无需模型推理。',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: '向量留言板',
      url,
      inLanguage: SITE_LANG,
      description:
        '标题明文不入库的加密留言板：向量搜索 + BLS12-381 验签，Cloudflare Workers 驱动。',
      author: { '@type': 'Person', name: 'tnteqaq' },
    },
  };
}

/** 按页面 id 列出可收录 URL 时使用的轻量条目（sitemap） */
export const SITEMAP_PAGES: ReadonlyArray<{ path: '/' | '/about'; priority: string }> = [
  { path: '/', priority: '1.0' },
  { path: '/about', priority: '0.6' },
];
