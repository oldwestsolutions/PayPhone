import { MarketplaceBody } from "@/components/MarketplaceBody";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Plug‑and‑play comms for verified‑identity marketplaces
        </h1>
        <p className="text-zinc-400 max-w-2xl text-sm leading-relaxed">
          payphone.cc is a dumb signaling relay: DIDs replace passwords, WebRTC
          media stays peer‑to‑peer, and escrow settlement is enforced on‑chain.
          Reputation and arbitration remain in your parent ecosystem.
        </p>
      </section>
      <MarketplaceBody />
    </div>
  );
}
