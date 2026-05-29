import Link from "next/link";
import { footerColumns, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white/85 mt-auto">
      <div className="h-1 bg-copper-shine" aria-hidden />

      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <p className="font-display text-3xl font-light text-white">
              {site.brand}
              <span className="text-copper-light">.cc</span>
            </p>
            <p className="text-sm leading-relaxed text-white/60 max-w-sm">
              Multi-tenant WebRTC signaling, DID authentication, reputation inheritance, and
              on-chain settlement—by {site.legalName}. Whitepaper v{site.whitepaperVersion}.
            </p>
            <p className="text-xs text-white/40">
              {site.registeredOffice}
              <br />
              Company no. 14882901 · {site.regulatoryRef}
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-corporate text-copper-light mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs text-white/40">
          <p>© {new Date().getFullYear()} {site.legalName}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/support#privacy" className="hover:text-white/70">
              Privacy policy
            </Link>
            <Link href="/support#terms" className="hover:text-white/70">
              Terms of use
            </Link>
            <Link href="/support#cookies" className="hover:text-white/70">
              Cookie settings
            </Link>
            <Link href="/support#regulatory" className="hover:text-white/70">
              Regulatory compliance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
