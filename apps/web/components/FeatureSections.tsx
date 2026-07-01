import Link from "next/link";
import {
  architectureServices,
  businessModel,
  caseStudies,
  designPrinciples,
  differentiators,
  executiveSummary,
  featureSections,
  introBand,
  problemMarkets,
  useCases,
} from "@/lib/content";
import { cn } from "@/lib/utils";

function FeatureIllustration({ variant }: { variant: string }) {
  if (variant === "voice") {
    return (
      <div className="rounded-3xl border border-luxury-border bg-luxury-panel p-8 flex items-center justify-center min-h-[280px]">
        <div className="relative w-48 h-48 rounded-full bg-white/20 border border-white/20/40 flex items-center justify-center shadow-luxury-glow">
          <svg viewBox="0 0 24 24" className="h-16 w-16 text-white" fill="currentColor">
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
          </svg>
          <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-white flex items-center justify-center text-luxury-black text-xs font-bold">
            🔒
          </div>
        </div>
      </div>
    );
  }

  if (variant === "privacy") {
    return (
      <div className="rounded-3xl border border-luxury-border bg-luxury-panel p-8 min-h-[280px] flex flex-col justify-center space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/20 border border-white/20/40 flex items-center justify-center text-xl">🔐</div>
          <div>
            <p className="text-sm font-medium text-white">Session-scoped</p>
            <p className="text-xs text-luxury-gray-dim">Mapping destroyed on close</p>
          </div>
        </div>
        <div className="rounded-2xl bg-luxury-black border border-luxury-border p-4 font-mono text-xs text-luxury-gray leading-relaxed">
          +1 (555) ***-**42 → seller
          <br />
          +1 (555) ***-**87 → buyer
          <br />
          <span className="text-white">SESSION_ENDED ✓</span>
        </div>
      </div>
    );
  }

  if (variant === "marketplaces") {
    return (
      <div className="rounded-3xl border border-luxury-border bg-luxury-panel p-6 min-h-[280px] space-y-3">
        {["Yard A — 4 min", "Yard B — 12 min", "Yard C — 2 min ✓"].map((row, i) => (
          <div
            key={row}
            className={cn(
              "flex items-center justify-between rounded-xl px-4 py-3 text-sm border",
              i === 2
                ? "bg-white/10 border-white/20/30 text-white font-medium"
                : "bg-luxury-elevated border-luxury-border text-luxury-gray"
            )}
          >
            <span>{row.split(" — ")[0]}</span>
            <span className="text-luxury-gray-dim">{row.split(" — ")[1]}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "messaging") {
    return (
      <div className="rounded-3xl border border-luxury-border bg-luxury-panel p-6 min-h-[280px] space-y-3">
        <div className="chat-bubble-out max-w-[200px] ml-auto text-xs">Part available? $180</div>
        <div className="chat-bubble-in max-w-[220px] text-xs">
          <span className="text-white font-semibold text-[10px]">Masked #</span>
          <br />
          Yes — can ship today
        </div>
        <div className="chat-bubble-out max-w-[180px] ml-auto text-xs">I&apos;ll take it 👍</div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/20/30 bg-luxury-elevated p-8 min-h-[280px] flex flex-col justify-center space-y-4">
      <p className="text-3xl font-mono font-light text-white">docker compose up</p>
      <p className="text-sm text-luxury-gray">5 services · PostgreSQL · Redis · Twilio</p>
      <div className="flex flex-wrap gap-2">
        {["API", "Session", "CRM", "Comm", "Haskell", "BTCPay"].map((s) => (
          <span key={s} className="rounded-pill bg-luxury-black border border-luxury-border px-3 py-1 text-xs text-luxury-gray">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeatureSections() {
  return (
    <>
      <section className="py-16 md:py-24 bg-luxury-black border-b border-luxury-border">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="heading-section text-luxury-gray">{introBand.title}</h2>
        </div>
      </section>

      <div id="features">
        {featureSections.map((section) => (
          <section
            key={section.id}
            id={section.id === "privacy" ? "privacy" : undefined}
            className={cn("py-16 md:py-24", section.accent)}
          >
            <div className="mx-auto max-w-7xl px-4">
              <div
                className={cn(
                  "grid lg:grid-cols-2 gap-12 lg:gap-20 items-center",
                  section.imageSide === "left" && "lg:[&>*:first-child]:order-2"
                )}
              >
                <div className="space-y-5">
                  <p className="section-eyebrow">{section.eyebrow}</p>
                  <h2 className="heading-section">
                    {section.title.includes("freely") ? (
                      <>
                        Speak
                        <br />
                        <strong className="font-semibold text-white">freely</strong>
                      </>
                    ) : section.title.includes("without exposure") ? (
                      <>
                        Message
                        <br />
                        <strong className="font-semibold text-white">without exposure</strong>
                      </>
                    ) : (
                      section.title
                    )}
                  </h2>
                  <p className="text-base leading-relaxed max-w-lg text-luxury-gray">
                    {section.body}
                  </p>
                  <Link
                    href={section.ctaHref}
                    className="inline-flex items-center gap-1 text-[15px] font-medium text-white hover:underline"
                  >
                    {section.cta}
                    <span aria-hidden>›</span>
                  </Link>
                </div>
                <FeatureIllustration variant={section.id} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section id="executive-summary" className="py-16 md:py-24 bg-luxury-dark scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-3xl space-y-6">
            <p className="section-eyebrow">Whitepaper v2.0</p>
            <h2 className="heading-section">{executiveSummary.title}</h2>
            {executiveSummary.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="text-base text-luxury-gray leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-luxury-black">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
            <p className="section-eyebrow">Problem definition</p>
            <h2 className="heading-section">Built for high-velocity marketplaces</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {problemMarkets.map((m) => (
              <div key={m.title} className="feature-card">
                <h3 className="text-lg font-medium text-white mb-3">{m.title}</h3>
                <p className="text-sm text-luxury-gray leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="py-16 md:py-24 bg-luxury-dark scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl mb-12 space-y-4">
            <p className="section-eyebrow">System overview</p>
            <h2 className="heading-section">Five core services</h2>
            <p className="text-luxury-gray">
              Loosely coupled microservices communicating through a Redis event bus. Start
              everything with{" "}
              <code className="text-sm bg-luxury-panel border border-luxury-border px-2 py-0.5 rounded text-white">
                docker compose up
              </code>
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {architectureServices.map((s, i) => (
              <div key={s.name} className="feature-card">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-luxury-black text-sm font-bold mb-4">
                  {i + 1}
                </span>
                <h3 className="text-lg font-medium text-white">{s.name}</h3>
                <p className="mt-2 text-sm text-luxury-gray leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-luxury-black">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="heading-section">Why Payphone</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentiators.map((d) => (
              <div key={d.title} className="text-center space-y-3 px-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-luxury-panel border border-white/20/20 flex items-center justify-center text-2xl shadow-luxury-glow">
                  {d.icon === "shield" ? "🛡️" : d.icon === "speed" ? "⚡" : d.icon === "layers" ? "📦" : "📊"}
                </div>
                <h3 className="text-lg font-medium text-white">{d.title}</h3>
                <p className="text-sm text-luxury-gray leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-luxury-panel border-y border-luxury-border">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 space-y-4">
            <p className="section-eyebrow">Case studies</p>
            <h2 className="heading-section">Proven workflows</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {caseStudies.map((c) => (
              <div key={c.title} className="feature-card border-white/20/10">
                <h3 className="text-lg font-medium text-white">{c.title}</h3>
                <p className="text-sm text-white font-medium mt-2">{c.result}</p>
                <p className="text-sm text-luxury-gray leading-relaxed mt-2">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-luxury-black">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="heading-section text-center mb-12">Design principles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {designPrinciples.map((p) => (
              <div key={p.title} className="feature-card">
                <h3 className="text-lg font-medium text-white">{p.title}</h3>
                <p className="mt-2 text-sm text-luxury-gray leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-16 md:py-24 bg-luxury-dark scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12">
          <div>
            <p className="section-eyebrow">Use cases</p>
            <h2 className="heading-section mt-3">Where Payphone fits</h2>
            <ul className="mt-8 space-y-3">
              {useCases.map((u) => (
                <li key={u} className="flex gap-3 text-sm text-luxury-gray leading-relaxed">
                  <span className="text-white shrink-0">✓</span>
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <div className="feature-card space-y-4 border-white/20/20">
            <p className="section-eyebrow">Monetization</p>
            <h3 className="text-2xl font-display font-light text-white">{businessModel.headline}</h3>
            <p className="text-sm text-luxury-gray leading-relaxed">{businessModel.detail}</p>
            <ul className="space-y-2">
              {businessModel.tiers.map((t) => (
                <li key={t} className="text-sm text-luxury-silver flex gap-2">
                  <span className="text-white">•</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/business" className="btn-download inline-flex text-sm mt-4">
              Integrate your marketplace
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-hero-luxury border-t border-luxury-border text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="relative mx-auto max-w-2xl px-4 space-y-6">
          <h2 className="heading-section">Download Payphone</h2>
          <p className="text-luxury-gray">
            Enterprise desktop app with Haskell escrow engine and BTCPayServer integration.
          </p>
          <Link href="/download" className="btn-download">
            Get the desktop app
          </Link>
        </div>
      </section>
    </>
  );
}
