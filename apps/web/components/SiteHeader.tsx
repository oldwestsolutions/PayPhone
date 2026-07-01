"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BellLogo } from "@/components/BellLogo";
import { hero, site, topNav } from "@/lib/content";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setHidden(false);
      return;
    }

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 48) {
        setHidden(false);
      } else if (y > lastY + 4) {
        setHidden(true);
      } else if (y < lastY - 4) {
        setHidden(false);
      }
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-luxury-black/95 backdrop-blur-md border-b border-luxury-border transition-transform duration-300 ease-out",
        isHome && hidden && "-translate-y-full"
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between gap-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <BellLogo size={40} />
            <div>
              <span className="font-display text-2xl font-medium text-white block leading-none">{site.brand}</span>
              <span className="text-[10px] uppercase tracking-widest text-luxury-gray-dim">{site.tagline}</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8" aria-label="Main">
            {topNav.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={hero.ctaSecondaryHref} className="btn-ghost-dark hidden sm:inline-flex text-sm py-2 px-5">
              {hero.ctaSecondary}
            </Link>
            <Link href="/download" className="btn-download text-sm py-2 px-5">
              <DownloadIcon />
              Download App
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
