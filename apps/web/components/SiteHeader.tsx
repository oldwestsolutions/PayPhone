"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/content";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 64;

function BellMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 36"
      className={cn("h-9 w-8", className)}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M16 2c-1 0-2 .5-2.5 1.5L8 14h16L18.5 3.5C18 2.5 17 2 16 2zm-8 14v2c0 5.5 3.5 10 8 11v3h4v-3c4.5-1 8-5.5 8-11v-2H8zm4 20h8v2H12v-2z"
      />
    </svg>
  );
}

export function SiteHeader() {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < SCROLL_THRESHOLD) {
        setHidden(false);
      } else if (delta > 4) {
        setHidden(true);
      } else if (delta < -4) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-cream/95 backdrop-blur-md border-b border-navy/10 transition-transform duration-300 ease-out will-change-transform",
        hidden && "-translate-y-full pointer-events-none"
      )}
    >
      <div className="bg-navy-deep text-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-[11px] uppercase tracking-corporate">
          <span className="hidden sm:inline text-white/60">
            {site.legalName} · {site.regulatoryRef}
          </span>
          <div className="flex gap-6 ml-auto">
            <Link href="/support" className="hover:text-copper-light transition">
              Customer center
            </Link>
            <Link href="/account" className="hover:text-copper-light transition">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between gap-6 py-4">
          <Link href="/" className="group flex items-center gap-3 shrink-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-copper-light shadow-luxury group-hover:bg-navy-mid transition">
              <BellMark />
            </span>
            <div>
              <span className="font-display text-2xl font-medium tracking-tight text-navy block leading-none">
                {site.brand}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-soft">
                {site.tagline}
              </span>
            </div>
          </Link>

          <Link href="/account" className="btn-primary inline-flex text-xs py-2.5 px-4">
            Client Portal
          </Link>
        </div>
      </div>
    </header>
  );
}
