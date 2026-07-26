import { useEffect, useRef, useState } from 'react';

let sharedObserver: IntersectionObserver | null = null;
const revealCallbacks = new WeakMap<Element, () => void>();

function getSharedObserver() {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cb = revealCallbacks.get(entry.target);
            if (cb) cb();
            sharedObserver?.unobserve(entry.target);
            revealCallbacks.delete(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
  }
  return sharedObserver;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Reveals an element once, using one shared IntersectionObserver for the
 * whole page. `index` provides a 70ms stagger capped at 6 items (420ms).
 */
export function useReveal<T extends HTMLElement>(index = 0) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const delay = Math.min(index, 6) * 70;
    const observer = getSharedObserver();
    revealCallbacks.set(el, () => {
      window.setTimeout(() => setVisible(true), delay);
    });
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      revealCallbacks.delete(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, visible };
}
