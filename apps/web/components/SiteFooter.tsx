import Link from "next/link";
import { BellLogo } from "@/components/BellLogo";
import { footerColumns, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="bg-luxury-dark border-t border-luxury-border mt-auto relative">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <BellLogo size={44} />
              <span className="font-display text-3xl font-light text-white">{site.brand}</span>
            </div>
            <p className="text-sm text-luxury-gray max-w-xs leading-relaxed">
              International tele communications for people who expect privacy, clarity, and a phone that simply works.
            </p>
            <Link href="/download" className="btn-download inline-flex">
              Download
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1 max-w-3xl">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-white mb-4">{col.title}</h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-luxury-gray hover:text-white transition"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-luxury-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs text-luxury-gray-dim">
          <p>
            © {new Date().getFullYear()} {site.legalName}. Whitepaper v{site.whitepaperVersion}.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/support#terms" className="hover:text-white">
              Terms &amp; Privacy Policy
            </Link>
            <Link href="/support#regulatory" className="hover:text-white">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
