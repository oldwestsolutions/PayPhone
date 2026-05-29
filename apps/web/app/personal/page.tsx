import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform overview",
  description:
    "How payphone.cc delivers anonymous WebRTC, DID auth, and on-chain settlement for verified marketplaces.",
};

export default function PersonalPage() {
  return (
    <>
      <PageHero
        dark
        eyebrow="For ecosystem operators"
        title="Plug in verified comms"
        subtitle="Drop payphone.cc into your marketplace via GitLab Runners—inherit reputation, gate providers, and settle on-chain without building signaling from scratch."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12">
          <div className="card-luxury card-3d p-8 space-y-4">
            <h2 className="heading-display text-2xl">What you get</h2>
            <ul className="space-y-3 text-sm text-slate-uk">
              <li>· STUN/TURN-aware WebRTC signaling (dumb relay)</li>
              <li>· ed25519 DID signatures on every API call</li>
              <li>· Read-only reputation from your source of truth</li>
              <li>· Escrow + 5% platform fee on-chain</li>
            </ul>
          </div>
          <div className="card-luxury card-3d p-8 space-y-4" id="coverage">
            <h3 className="font-display text-xl">Request access</h3>
            <p className="text-sm text-slate-uk">
              Tenant provisioning is manual during the whitepaper preview. Describe your
              ecosystem and minimum reputation thresholds.
            </p>
            <Link href="/support" className="btn-primary text-xs inline-flex">
              Contact Old West Solutions
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 text-center">
        <Link href="/#architecture" className="btn-secondary">
          Read architecture
        </Link>
      </section>
    </>
  );
}
