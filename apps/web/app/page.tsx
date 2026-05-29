import type { Metadata } from "next";
import { Hero3D } from "@/components/Hero3D";
import { WhitepaperSections } from "@/components/WhitepaperSections";
import { DirectoryCard } from "@/components/DirectoryCard";
import Link from "next/link";
import { directory } from "@/lib/content";

export const metadata: Metadata = {
  title: "payphone.cc — WebRTC & On-Chain Settlement for Verified Marketplaces",
  description:
    "Multi-tenant comms microservice: anonymous P2P WebRTC, DID ed25519 auth, reputation inheritance, 5% on-chain escrow. Whitepaper v1.0 by Old West Solutions LLC.",
};

export default function HomePage() {
  return (
    <>
      <Hero3D />
      <WhitepaperSections />

      <section className="py-20 md:py-28 bg-white relative">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div className="space-y-3">
              <p className="section-label">Verified directory</p>
              <h2 className="heading-display text-3xl md:text-4xl">
                Professionals on the network
              </h2>
              <p className="text-sm text-slate-uk max-w-lg">
                Example listings for attorneys, liaisons, and field engineers—inheriting
                reputation from parent ecosystems.
              </p>
            </div>
            <Link
              href="/directory"
              className="text-xs font-semibold uppercase tracking-corporate text-crimson hover:text-crimson-bright"
            >
              View full directory →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {directory.map((entry) => (
              <DirectoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
