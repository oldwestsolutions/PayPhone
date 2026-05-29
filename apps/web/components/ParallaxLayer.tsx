"use client";

import { useParallax } from "@/hooks/useParallax";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  speed?: number;
  maxOffset?: number;
  as?: "div" | "section";
};

export function ParallaxLayer({
  children,
  className,
  speed = 0.35,
  maxOffset = 100,
  as: Tag = "div",
}: Props) {
  const { ref, style } = useParallax({ speed, maxOffset });

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn("will-change-transform", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
