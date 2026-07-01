import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import type { Metadata } from "next";
import { architectureServices, businessModel } from "@/lib/content";

export const metadata: Metadata = {
  title: "For Business",
  description:
    "Deploy Payphone for your marketplace—Docker Compose, masked sessions, CRM analytics, and usage-based pricing.",
};

const tiers = [
  {
    name: "Pilot",
    price: businessModel.tiers[0],
    desc: "Single marketplace, Docker Compose on one host, Twilio number pool for masked sessions.",
  },
  {
    name: "Volume",
    price: businessModel.tiers[1],
    desc: "Multiple sellers, response-time leaderboards, dynamic number pool sizing.",
  },
  {
    name: "Enterprise",
    price: businessModel.tiers[2],
    desc: "Dedicated number pool, custom SLA, optional Payment Adapter with Circle USDC and Stellar XLM.",
  },
];

export default function BusinessPage() {
  return (
    <>
      <PageHero
        eyebrow="For marketplace operators"
        title="Transform your marketplace"
        subtitle="Self-hosted masked voice and SMS for buyers and sellers. Five microservices, one docker compose up command, CRM tracking built in."
      />

      <section className="py-16 bg-luxury-black" id="deploy">
        <div className="mx-auto max-w-7xl px-4 space-y-8">
          <h2 className="heading-section">Deployment model</h2>
          <p className="text-base text-luxury-gray max-w-2xl leading-relaxed">
            The full system starts with{" "}
            <code className="bg-luxury-panel border border-luxury-border px-2 py-0.5 rounded text-sm text-white">
              docker compose up
            </code>
            . No cloud runtime required beyond Twilio API access.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {architectureServices.map((s) => (
              <div key={s.name} className="feature-card">
                <h3 className="font-medium text-white">{s.name}</h3>
                <p className="mt-2 text-sm text-luxury-gray">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-luxury-dark">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl bg-luxury-panel border border-luxury-border p-8 font-mono text-sm space-y-2">
            <p className="text-white">$ docker compose up -d</p>
            <p className="text-luxury-gray-dim">Starting postgres, redis, api-gateway...</p>
            <p className="text-luxury-gray-dim">Starting contract-engine, btcpay...</p>
            <p className="text-white mt-4">✓ API Gateway: http://localhost:4000</p>
            <p className="text-white">✓ Haskell Engine: http://localhost:4004</p>
          </div>
          <div className="space-y-4">
            <h2 className="heading-section">Local development setup</h2>
            <p className="text-sm text-luxury-gray leading-relaxed">
              Requirements: Docker Desktop, Node.js 20, Twilio account, ngrok for webhooks.
            </p>
            <Link href="/download" className="btn-download inline-flex text-sm">
              Download desktop app
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-luxury-black" id="enterprise">
        <div className="mx-auto max-w-7xl px-4">
          <p className="section-eyebrow mb-8">Pricing tiers</p>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <article key={t.name} className="feature-card space-y-4">
                <h3 className="text-2xl font-display font-light text-white">{t.name}</h3>
                <p className="text-white font-medium text-sm">{t.price}</p>
                <p className="text-sm text-luxury-gray">{t.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
