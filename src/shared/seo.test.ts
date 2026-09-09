import { describe, expect, it } from 'vitest';
import {
  ARTICLE_DATE_MODIFIED,
  getSeoDescriptor,
  SITEMAP_PAGES,
} from './seo';
import { injectSeo, robotsTxt, sitemapXml } from '../worker/seo';

const ORIGIN = 'https://notes.example.com';

describe('seo descriptors', () => {
  it('provides complete home/about descriptors', () => {
    for (const id of ['home', 'about'] as const) {
      const d = getSeoDescriptor(id, ORIGIN);
      expect(d.title.length).toBeGreaterThan(5);
      expect(d.description.length).toBeGreaterThan(20);
      expect(d.path === '/' || d.path === '/about').toBe(true);
      expect(JSON.stringify(d.jsonLd)).not.toContain('<');
    }
  });

  it('binds absolute URLs to the given origin', () => {
    const about = getSeoDescriptor('about', ORIGIN);
    expect(about.path).toBe('/about');
    expect(JSON.stringify(about.jsonLd)).toContain(`${ORIGIN}/about`);
    expect(about.ogType).toBe('article');

    const home = getSeoDescriptor('home', ORIGIN);
    expect(home.ogType).toBe('website');
  });

  it('uses a valid ISO dateModified for the article', () => {
    expect(Number.isFinite(Date.parse(ARTICLE_DATE_MODIFIED))).toBe(true);
  });

  it('lists exactly the indexable pages in the sitemap data', () => {
    expect(SITEMAP_PAGES.map((p) => p.path)).toEqual(['/', '/about']);
  });
});

describe('worker html injection', () => {
  const TEMPLATE = [
    '<title>%VEC_TITLE%</title>',
    '<meta name="description" content="%VEC_DESCRIPTION%" />',
    '<meta name="robots" content="index,follow" />',
    '<link rel="canonical" href="%VEC_ORIGIN%%VEC_PATH%" />',
    '<meta property="og:type" content="%VEC_OG_TYPE%" />',
    '<meta property="og:url" content="%VEC_ORIGIN%%VEC_PATH%" />',
    '<script type="application/ld+json" id="seo-jsonld">%VEC_JSONLD%</script>',
  ].join('\n');

  it('replaces every placeholder and leaves no %VEC_*% token behind', () => {
    const html = injectSeo(TEMPLATE, 'home', ORIGIN);
    expect(html).not.toMatch(/%VEC_[A-Z_]+%/);
    expect(html).toContain(ORIGIN + '/');
    expect(html).toContain('content="website"');
    expect(html).toContain('content="index,follow"');
  });

  it('injects the about page on /about', () => {
    const html = injectSeo(TEMPLATE, 'about', ORIGIN);
    expect(html).not.toMatch(/%VEC_[A-Z_]+%/);
    expect(html).toContain(`${ORIGIN}/about`);
    expect(html).toContain('content="article"');
  });

  it('switches robots to noindex for 404 pages', () => {
    const html = injectSeo(TEMPLATE, 'home', ORIGIN, true);
    expect(html).toContain('content="noindex"');
    expect(html).not.toContain('index,follow');
  });

  it('keeps well-formed title tags after injection', () => {
    const html = injectSeo(TEMPLATE, 'home', ORIGIN);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it('robots.txt allows pages, disallows api, and points at the sitemap', () => {
    const r = robotsTxt(ORIGIN);
    expect(r).toContain('Allow: /');
    expect(r).toContain('Disallow: /api/');
    expect(r).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it('sitemap.xml contains both canonical URLs', () => {
    const s = sitemapXml(ORIGIN);
    expect(s).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(s).toContain(`<loc>${ORIGIN}/about</loc>`);
  });
});
