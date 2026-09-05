import { useEffect, useState, type RefObject } from 'react';

/**
 * Observes `ref` and reports whether its element is inside the viewport.
 * With `once`, the flag latches true at the first intersection and the
 * observer disconnects — enough for scroll-triggered entrances (Reveal).
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = false }: { once?: boolean } = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // very old environments: show everything immediately
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once]);

  return inView;
}
