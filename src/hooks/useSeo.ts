import { useEffect } from 'react';
import {
  getSeoDescriptor,
  SITE_LOCALE,
  SITE_NAME,
  type SeoPageId,
} from '../shared/seo';

type MetaMap = Record<string, string>;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sync document <title> + SEO meta tags with the current page.
 * Absolute URLs use the live window origin (the Worker performs the same
 * injection server-side from the request host).
 */
export function useSeo(pageId: string): void {
  useEffect(() => {
    const id: SeoPageId = pageId === 'about' ? 'about' : pageId === 'home' ? 'home' : 'home';
    const origin = window.location.origin;
    const seo = getSeoDescriptor(id, origin);
    const url = `${origin}${seo.path}`;

    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertLink('canonical', url);

    const og: MetaMap = {
      'og:title': seo.title,
      'og:description': seo.description,
      'og:type': seo.ogType,
      'og:url': url,
      'og:site_name': SITE_NAME,
      'og:locale': SITE_LOCALE,
      'og:image': `${origin}/og.svg`,
      'og:image:type': 'image/svg+xml',
      'og:image:width': '1200',
      'og:image:height': '630',
    };
    for (const [k, v] of Object.entries(og)) upsertMeta('property', k, v);

    const twitter: MetaMap = {
      'twitter:card': 'summary_large_image',
      'twitter:title': seo.title,
      'twitter:description': seo.description,
      'twitter:image': `${origin}/og.svg`,
    };
    for (const [k, v] of Object.entries(twitter)) upsertMeta('name', k, v);

    let ld = document.getElementById('seo-jsonld');
    if (!ld) {
      ld = document.createElement('script');
      ld.id = 'seo-jsonld';
      ld.setAttribute('type', 'application/ld+json');
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(seo.jsonLd);
  }, [pageId]);
}
