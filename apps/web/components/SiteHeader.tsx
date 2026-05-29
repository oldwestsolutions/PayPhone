"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site, topNav } from "@/lib/content";
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
  const pathname = usePathname();
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
      {/* Utility bar — Verizon-style top strip */}
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
            <Link href="/support#stores" className="hover:text-copper-light transition">
              Find a shop
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

          <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
            {topNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href.split("#")[0]))
                    ? "nav-link-active"
                    : "nav-link"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <label className="hidden md:flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-3 py-2">
              <span className="sr-only">Search</span>
              <svg className="h-4 w-4 text-slate-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                type="search"
                placeholder="Search help & plans"
                className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-soft/80"
              />
            </label>
            <Link href="/business" className="btn-primary hidden sm:inline-flex text-xs py-2.5 px-4">
              Integrate
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        className="lg:hidden flex gap-1 overflow-x-auto border-t border-navy/10 px-4 py-2 bg-cream-warm/50"
        aria-label="Mobile primary"
      >
        {topNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium text-slate-uk hover:bg-white hover:text-navy"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
