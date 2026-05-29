"use client";

import Link from "next/link";
import { ParallaxLayer } from "@/components/ParallaxLayer";
import {
  architectureTiers,
  businessModel,
  designPrinciples,
  differentiators,
  problemGaps,
  useCases,
  whyAnonymity,
} from "@/lib/content";
import { cn } from "@/lib/utils";

function Card3D({
  children,
  className,
  depth = "md",
}: {
  children: React.ReactNode;
  className?: string;
  depth?: "sm" | "md" | "lg";
}) {
  const shadow =
    depth === "lg"
      ? "shadow-[0_24px_60px_-12px_rgba(12,26,46,0.35),0_8px_24px_-8px_rgba(184,115,51,0.15)]"
      : depth === "sm"
        ? "shadow-[0_12px_32px_-8px_rgba(12,26,46,0.2)]"
        : "shadow-card";

  return (
    <div
      className={cn(
        "card-luxury card-3d p-6 md:p-8 transition-transform duration-300 hover:-translate-y-1",
        shadow,
        className
      )}
    >
      {children}
    </div>
  );
}

export function WhitepaperSections() {
  return (
    <>
      {/* Problem */}
      <section id="whitepaper" className="relative py-20 md:py-28 bg-cream scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4">
          <ParallaxLayer speed={0.25} maxOffset={40}>
            <div className="max-w-2xl space-y-4 mb-12">
              <p className="section-label">Whitepaper · Executive summary</p>
              <h2 className="heading-display text-3xl md:text-4xl">The gap in comms marketplaces</h2>
              <div className="rule-gold" />
              <p className="text-sm text-slate-uk leading-relaxed">
                Legal, consulting, real estate, and healthcare marketplaces need verified
                peer-to-peer infrastructure with anonymity, inherited trust, and transparent
                settlement—without rebuilding the stack every launch.
              </p>
            </div>
          </ParallaxLayer>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {problemGaps.map((g, i) => (
              <ParallaxLayer key={g.name} speed={0.2 + i * 0.05} maxOffset={30}>
                <Card3D depth="sm">
                  <h3 className="font-display text-xl text-navy">{g.name}</h3>
                  <p className="mt-3 text-sm text-slate-uk leading-relaxed">{g.issue}</p>
                </Card3D>
              </ParallaxLayer>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="relative py-20 md:py-28 bg-white overflow-hidden scroll-mt-24">
        <div className="scene-glow absolute top-0 right-0 w-[60%] h-[50%] opacity-40 pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
            <p className="section-label">Solution</p>
            <h2 className="heading-display text-3xl md:text-4xl">Pluggable microservice</h2>
            <div className="rule-gold mx-auto" />
            <p className="text-sm text-slate-uk leading-relaxed">
              payphone.cc provides WebRTC signaling, on-chain settlement, and reputation
              inheritance from parent ecosystems—so verified professionals offer paid comms
              without exposing PII or central call logs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {differentiators.map((d, i) => (
              <ParallaxLayer key={d.title} speed={0.3 + i * 0.04} maxOffset={50}>
                <Card3D depth="md" className="h-full flex flex-col">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-copper-light text-lg font-display">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-xl text-navy mt-4">{d.title}</h3>
                  <p className="mt-3 text-sm text-slate-uk leading-relaxed flex-1">{d.body}</p>
                </Card3D>
              </ParallaxLayer>
            ))}
          </div>
        </div>
      </section>

      {/* Why anonymity */}
      <section className="relative py-20 bg-navy-deep text-white overflow-hidden">
        <div className="absolute inset-0 scene-grid opacity-20 pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
          <ParallaxLayer speed={0.3}>
            <div className="space-y-4">
              <p className="section-label text-copper-light">Why anonymity</p>
              <h2 className="font-display text-3xl md:text-4xl font-light">
                PSTN reveals identity. WebRTC + DID does not.
              </h2>
              <p className="text-sm text-white/65 leading-relaxed">
                Traditional SIP and phone numbers require PII and permanent records. DID
                authentication lets parties verify qualifications without revealing who is calling.
              </p>
            </div>
          </ParallaxLayer>
          <ul className="space-y-3">
            {whyAnonymity.map((item, i) => (
              <ParallaxLayer key={item} speed={0.25 + i * 0.03} maxOffset={25}>
                <li className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-5 py-4 text-sm text-white/80">
                  {item}
                </li>
              </ParallaxLayer>
            ))}
          </ul>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative py-20 md:py-28 bg-cream-warm/60 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl space-y-4 mb-14">
            <p className="section-label">Architecture & design</p>
            <h2 className="heading-display text-3xl md:text-4xl">Five tiers</h2>
            <div className="rule-gold" />
          </div>
          <div className="space-y-4 md:space-y-6">
            {architectureTiers.map((t, i) => (
              <ParallaxLayer key={t.tier} speed={0.2 + (i % 3) * 0.08} maxOffset={35}>
                <article
                  className={cn(
                    "card-luxury card-3d flex flex-col md:flex-row gap-6 p-6 md:p-8",
                    i % 2 === 1 && "md:flex-row-reverse"
                  )}
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-mid text-copper-light font-display text-3xl shadow-luxury">
                    {t.tier}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl text-navy">{t.name}</h3>
                    <p className="mt-3 text-sm text-slate-uk leading-relaxed">{t.body}</p>
                  </div>
                </article>
              </ParallaxLayer>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <p className="section-label text-center">Design principles</p>
          <h2 className="heading-display text-3xl md:text-4xl text-center mt-3">
            Built to stay dumb
          </h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mt-12">
            {designPrinciples.map((p, i) => (
              <ParallaxLayer key={p.title} speed={0.28 + i * 0.04} maxOffset={40}>
                <Card3D>
                  <h3 className="font-display text-xl text-crimson">{p.title}</h3>
                  <p className="mt-3 text-sm text-slate-uk leading-relaxed">{p.body}</p>
                </Card3D>
              </ParallaxLayer>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases + business */}
      <section id="use-cases" className="relative py-20 md:py-28 bg-hero-gradient text-white overflow-hidden scroll-mt-24">
        <div className="scene-grid absolute inset-0 opacity-15 pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="section-label text-copper-light">Use cases</p>
            <h2 className="font-display text-3xl md:text-4xl font-light mt-3">Where payphone fits</h2>
            <ul className="mt-8 space-y-4">
              {useCases.map((u) => (
                <li
                  key={u}
                  className="flex gap-3 text-sm text-white/80 leading-relaxed rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-crimson shrink-0">→</span>
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <ParallaxLayer speed={0.35} maxOffset={50}>
            <Card3D
              depth="lg"
              className="!bg-white/10 !border-white/20 backdrop-blur-xl text-white"
            >
              <p className="section-label text-copper-light">Business model</p>
              <p className="font-display text-5xl md:text-6xl text-copper-light mt-4">
                {businessModel.fee}
              </p>
              <p className="text-xs uppercase tracking-wide text-white/50 mt-1">
                platform fee on call value
              </p>
              <h3 className="font-display text-2xl mt-8">{businessModel.headline}</h3>
              <p className="mt-4 text-sm text-white/70 leading-relaxed">{businessModel.detail}</p>
              <Link href="/business" className="btn-primary mt-8 inline-flex text-xs">
                Integrate your ecosystem
              </Link>
            </Card3D>
          </ParallaxLayer>
        </div>
      </section>
    </>
  );
}
