/// <reference types="@cloudflare/workers-types" />
import {
  getSeoDescriptor,
  SITEMAP_PAGES,
  type SeoPageId,
} from '../shared/seo';

/**
 * 运行时 SEO：robots / sitemap 动态生成，index.html 中的 %VEC_*% 占位符
 * 按请求路径与域名替换。仓库不硬编码任何私有域名——origin 取自可选的
 * SITE_URL 变量，否则回退到请求自身的 origin（fork 即用）。
 */

export function resolveOrigin(request: Request, siteUrl?: string): string {
  const fromEnv = (siteUrl ?? '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

const KNOWN_HTML: Record<string, SeoPageId> = {
  '/': 'home',
  '/index.html': 'home',
  '/about': 'about',
  '/about/': 'about',
};

/** 已知可收录的 HTML 页面路径；其余 GET 路径一律 404 */
export function knownHtmlPage(pathname: string): SeoPageId | null {
  return KNOWN_HTML[pathname] ?? null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 把构建产物 index.html 中的占位符替换为当前页面的 SEO 数据。
 * 所有占位符都必须被消费；返回的文本不应残留 %VEC_*% token。
 */
export function injectSeo(
  html: string,
  pageId: SeoPageId,
  origin: string,
  noindex = false,
): string {
  const seo = getSeoDescriptor(pageId, origin);
  const replacements: Record<string, string> = {
    '%VEC_TITLE%': escapeHtml(seo.title),
    '%VEC_DESCRIPTION%': escapeHtml(seo.description),
    '%VEC_OG_TYPE%': seo.ogType,
    '%VEC_ORIGIN%': origin,
    '%VEC_PATH%': seo.path === '/' ? '/' : seo.path,
    '%VEC_JSONLD%': JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c'),
  };
  let out = html;
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  if (noindex) {
    out = out.replace(
      '<meta name="robots" content="index,follow" />',
      '<meta name="robots" content="noindex" />',
    );
  }
  return out;
}

export function robotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemapXml(origin: string): string {
  const urls = SITEMAP_PAGES.map(
    (p) =>
      `  <url>\n    <loc>${origin}${p.path === '/' ? '/' : p.path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function textResponse(body: string, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=3600',
    },
  });
}

let indexHtmlCache: string | null = null;

/**
 * 处理所有非 /api 的 GET 请求：
 * - /robots.txt、/sitemap.xml 动态生成
 * - 已知页面 → 注入 SEO 后返回 index.html（200）
 * - 其它存在的静态资源 → 原样透传 ASSETS
 * - 未知路径 → 注入 SEO（noindex）并返回真实 404
 * 返回 null 表示调用方应继续其它分支（如非 GET）。
 */
export async function handleSeoAsset(
  request: Request,
  env: { ASSETS: Fetcher; SITE_URL?: string },
): Promise<Response | null> {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = resolveOrigin(request, env.SITE_URL);

  if (pathname === '/robots.txt') {
    return textResponse(robotsTxt(origin), 'text/plain; charset=utf-8');
  }
  if (pathname === '/sitemap.xml') {
    return textResponse(sitemapXml(origin), 'application/xml; charset=utf-8');
  }

  const known = knownHtmlPage(pathname);

  // 已知 HTML 页面必须走注入（ASSETS 会把 '/'、'/index.html' 命中为原始模板，
  // 那样 %VEC_*% 占位符会原样泄漏到响应里）。
  if (!known) {
    // 其余路径先按静态资源透传（hash 资源、/logo.svg、/og.svg 等）
    const direct = await env.ASSETS.fetch(request);
    if (direct.status !== 404) return direct;
  }

  // 资源不存在：已知页面返回注入后的 index.html，其它路径返回 404 HTML
  const pageId: SeoPageId = known ?? 'home';
  if (!indexHtmlCache) {
    const tplUrl = new URL(request.url);
    tplUrl.pathname = '/index.html';
    tplUrl.search = '';
    // 全新请求（切勿把入站 request 作为第二参数：其 URL 可能仍是 '/'，
    // 会让 ASSETS 绑定递归回当前 Worker 而取到空响应）。
    const tpl = await env.ASSETS.fetch(new Request(tplUrl.toString()));
    indexHtmlCache = await tpl.text();
  }
  const html = injectSeo(indexHtmlCache, pageId, origin, known === null);
  return new Response(html, {
    status: known ? 200 : 404,
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
