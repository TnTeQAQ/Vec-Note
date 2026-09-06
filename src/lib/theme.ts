export type Theme = 'light' | 'dark';

const LS_KEY = 'vec-note:theme';
const EVENT = 'vec-note:theme-change';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Tab icon：与站点 Logo 同款「三点气泡」；浅色主题白底深纹，深色主题深底白纹。
 */
function applyFavicon(theme: Theme) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  const body = theme === 'light' ? '#ffffff' : '#08060d';
  const ink = theme === 'light' ? '#08060d' : '#ffffff';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="7" fill="${body}"/>` +
    `<g transform="translate(3.7 3.3) scale(0.024)" fill="${ink}">` +
    `<path d="M511.913993 928.016126c-8.256677 0-16.341341-3.096254-22.705863-9.460776l-95.983874-95.983874c-12.55703-12.55703-12.55703-32.682681 0-45.239711s32.682681-12.55703 45.239711 0l73.450025 73.450025 73.450025-73.450025c6.020494-6.020494 14.105157-9.460776 22.705863-9.460776l223.962372 0c17.717453 0 31.994625-14.277171 31.994625-31.994625L864.026877 223.962372c0-17.545439-14.277171-31.994625-31.994625-31.994625l-639.892491 0c-17.545439 0-31.994625 14.449185-31.994625 31.994625l0 511.913993c0 17.717453 14.449185 31.994625 31.994625 31.994625l95.983874 0c17.717453 0 31.994625 14.277171 31.994625 31.994625s-14.277171 31.994625-31.994625 31.994625l-95.983874 0c-52.980346 0-95.983874-43.003528-95.983874-95.983874L96.155888 223.962372c0-52.980346 43.003528-95.983874 95.983874-95.983874l639.892491 0c52.980346 0 95.983874 43.003528 95.983874 95.983874l0 511.913993c0 52.980346-43.003528 95.983874-95.983874 95.983874L621.142953 831.860239 534.619856 918.55535C528.427348 924.747858 520.17067 928.016126 511.913993 928.016126z"/>` +
    `<path d="M335.943558 511.913993c-26.490173 0-47.991937-21.501764-47.991937-47.991937s21.501764-47.991937 47.991937-47.991937 47.991937 21.501764 47.991937 47.991937S362.433731 511.913993 335.943558 511.913993z"/>` +
    `<path d="M527.911305 511.913993c-26.490173 0-47.991937-21.501764-47.991937-47.991937s21.501764-47.991937 47.991937-47.991937 47.991937 21.501764 47.991937 47.991937S554.401478 511.913993 527.911305 511.913993z"/>` +
    `<path d="M720.051067 511.913993c-26.490173 0-47.991937-21.501764-47.991937-47.991937s21.501764-47.991937 47.991937-47.991937c26.490173 0 47.991937 21.501764 47.991937 47.991937S746.369226 511.913993 720.051067 511.913993z"/>` +
    `</g></svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

applyFavicon(getTheme());

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(LS_KEY, theme);
  } catch {
    /* storage unavailable */
  }
  applyFavicon(theme);
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function subscribeTheme(fn: (theme: Theme) => void): () => void {
  const handler = (event: Event) => fn((event as CustomEvent<Theme>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
