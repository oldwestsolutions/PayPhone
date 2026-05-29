"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Multiplier for scroll offset; negative moves opposite */
  speed?: number;
  /** Max pixels to translate (mobile safety) */
  maxOffset?: number;
};

export function useParallax({ speed = 0.4, maxOffset = 120 }: Options = {}) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    setEnabled(!reduced);

    if (reduced) return;

    let raf = 0;
    const cap = narrow ? maxOffset * 0.45 : maxOffset;

    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const y = (clamped - 0.5) * cap * speed * 2;
      setOffset(Math.max(-cap, Math.min(cap, y)));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed, maxOffset]);

  const style = enabled
    ? { transform: `translate3d(0, ${offset}px, 0)` }
    : undefined;

  return { ref, style, offset, enabled };
}

export function useHeroScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.85)));
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return progress;
}
