import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { getTheme, setTheme, subscribeTheme, type Theme } from '../lib/theme';
import './ThemeToggle.css';

const BG: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#0b0b0f',
};

/** one expanding theme wave: starts at the click point, radius grows to cover */
type Wave = { r: number; theme: Theme; x: number; y: number; cover: number };

/**
 * Theme switch with concentric ripple regions.
 *
 * Every click flips the theme immediately and starts a new expanding wave
 * from the click point. One persistent overlay paints alternating theme
 * rings between the wave fronts: outside the first wave the session's
 * initial theme shows, between wave N-1 and wave N the theme after click
 * N-1 shows, and inside the newest wave the current theme shows — that
 * innermost region is transparent so the real (already switched) page shows
 * through. Rapid clicks spread like alternating onion rings.
 */
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wavesRef = useRef<Wave[]>([]);
  const outerThemeRef = useRef<Theme>(getTheme());
  const rafRef = useRef(0);

  useEffect(() => subscribeTheme((t) => setThemeState(t)), []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      overlayRef.current?.remove();
      overlayRef.current = null;
    };
  }, []);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    overlayRef.current?.remove();
    overlayRef.current = null;
    wavesRef.current = [];
  };

  /** paints the alternating theme rings for the current wave fronts */
  const renderRings = () => {
    const overlay = overlayRef.current;
    const waves = wavesRef.current;
    if (!overlay || waves.length === 0) return;

    const page = getTheme();
    // waves[0] is the oldest (largest), the last one is the newest (smallest)
    const stops: string[] = [];
    let prev = 0;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      const end = Math.max(prev + 0.5, w.r);
      // innermost region (i is newest when i === length-1) is transparent,
      // older rings are filled with their own theme's background
      const color = w.theme === page ? 'transparent' : BG[w.theme];
      stops.push(`${color} ${prev}px ${end}px`);
      prev = end;
    }
    // region beyond the oldest wave keeps the session's initial theme
    const outer =
      outerThemeRef.current === page ? 'transparent' : BG[outerThemeRef.current];
    stops.push(`${outer} ${prev}px 200%`);

    const newest = waves[waves.length - 1];
    overlay.style.background = `radial-gradient(circle at ${newest.x}px ${newest.y}px, ${stops.join(', ')})`;
  };

  const tick = () => {
    const waves = wavesRef.current;
    if (waves.length === 0) {
      stop();
      return;
    }
    const newest = waves[waves.length - 1];
    for (const w of waves) {
      w.r += (w.cover - w.r) * 0.085;
      if (w.r >= w.cover - 0.4) w.r = w.cover;
    }
    // the session ends once the newest wave has covered the whole screen
    if (newest.r >= newest.cover) {
      stop();
      return;
    }
    renderRings();
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';

    if (wavesRef.current.length === 0) {
      outerThemeRef.current = current; // theme outside all waves
    }
    const x = e.clientX;
    const y = e.clientY;
    const cover =
      Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      ) + 24;

    setTheme(next); // the page itself is always the newest theme
    // 切换瞬间禁用所有颜色过渡，避免海量节点同时过渡导致卡顿
    document.documentElement.classList.add('no-transitions');
    window.setTimeout(() => document.documentElement.classList.remove('no-transitions'), 400);
    wavesRef.current.push({ r: 0, theme: next, x, y, cover });
    if (!overlayRef.current) {
      const el = document.createElement('div');
      el.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:9990',
        'pointer-events:none',
        'will-change:background',
      ].join(';');
      document.body.appendChild(el);
      overlayRef.current = el;
    }
    renderRings();
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleClick}
      title="切换主题"
      aria-label="切换主题"
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}
