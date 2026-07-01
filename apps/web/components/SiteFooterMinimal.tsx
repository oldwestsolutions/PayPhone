import Link from "next/link";
import { site } from "@/lib/content";

/** Compact legal bar for inner pages. */
export function SiteFooterMinimal() {
  return (
    <footer className="border-t border-luxury-border mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row gap-2 justify-between text-xs text-luxury-gray-dim">
        <p>
          © {new Date().getFullYear()} {site.legalName}
        </p>
        <div className="flex gap-4">
          <Link href="/support#terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/" className="hover:text-white">
            Home
          </Link>
        </div>
      </div>
    </footer>
  );
}
