import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrate",
  description:
    "Multi-tenant payphone.cc deployment for verified-identity marketplaces—Docker, GitLab Runners, isolated namespaces.",
};

const tiers = [
  {
    name: "Pilot tenant",
    price: "Custom",
    desc: "Single ecosystem, shared STUN/TURN, dedicated API namespace and DB isolation.",
  },
  {
    name: "Regional",
    price: "Custom",
    desc: "Multiple verticals, configurable reputation readers, SLA on signaling uptime.",
  },
  {
    name: "Enterprise",
    price: "Bespoke",
    desc: "Dedicated runners, custom settlement contracts, 99.999% signaling SLA.",
  },
];

export default function BusinessPage() {
  return (
    <>
      <PageHero
        dark
        eyebrow="Multi-tenant deploy"
        title="Integrate your ecosystem"
        subtitle="GitLab Runners spin isolated payphone instances per marketplace—Docker boundaries, dedicated endpoints, reputation gating from your existing KYC."
      />

      <section className="py-16" id="trunks">
        <div className="mx-auto max-w-7xl px-4 space-y-8">
          <h2 className="heading-display text-3xl">Deployment model</h2>
          <p className="text-sm text-slate-uk max-w-2xl leading-relaxed">
            Each tenant receives isolated session state while sharing hardened STUN/TURN
            infrastructure. No media relay—peer-to-peer DTLS-SRTP only.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white" id="booth">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="card-luxury card-3d aspect-video bg-navy payphone-grille flex items-center justify-center">
            <span className="font-display text-3xl text-copper-light">Tenant</span>
          </div>
          <div className="space-y-4">
            <h2 className="heading-display text-3xl">Reputation inheritance</h2>
            <p className="text-sm text-slate-uk leading-relaxed">
              Trust stays in Centuries Mutual, your consulting network, or healthcare
              panel—payphone reads scores read-only. Providers set visibility thresholds;
              the comms layer stays disposable.
            </p>
            <Link href="/#architecture" className="btn-primary text-xs">
              View five-tier architecture
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-cream-warm/50" id="enterprise">
        <div className="mx-auto max-w-7xl px-4">
          <p className="section-label mb-8">Engagement tiers</p>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <article key={t.name} className="card-luxury card-3d p-8 space-y-4">
                <h3 className="font-display text-2xl">{t.name}</h3>
                <p className="text-crimson font-semibold text-sm">{t.price}</p>
                <p className="text-sm text-slate-uk">{t.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
