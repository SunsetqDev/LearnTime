import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Ширина контейнера через ResizeObserver — графики пересчитывают шкалы под реальный размер. */
export function useWidth<T extends HTMLElement>(fallback = 640): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);
  return [ref, width];
}
