"use client";

import { useCallback, useEffect, useState } from "react";

/** Subtle pointer tilt for 3D cards — disabled on touch / reduced motion */
export function useTilt3D(maxDeg = 8) {
  const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg)");
  const [active, setActive] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setActive(!reduced && !coarse);
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!active) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTransform(
        `rotateX(${(-y * maxDeg).toFixed(2)}deg) rotateY(${(x * maxDeg).toFixed(2)}deg)`
      );
    },
    [active, maxDeg]
  );

  const onLeave = useCallback(() => {
    setTransform("rotateX(0deg) rotateY(0deg)");
  }, []);

  return {
    active,
    style: {
      transform: `${transform} scale3d(1, 1, 1)`,
      transition: active ? "transform 0.12s ease-out" : undefined,
    } as React.CSSProperties,
    onMove,
    onLeave,
  };
}
