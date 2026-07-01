"use client";

import Link from "next/link";
import { hero } from "@/lib/content";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckMarks() {
  return (
    <span className="inline-flex text-white/60 ml-1" aria-label="Read">
      <svg viewBox="0 0 16 11" className="h-3 w-4" fill="currentColor">
        <path d="M11.071.653a.75.75 0 011.028 1.028l-6.5 6.75a.75.75 0 01-1.08.02L2.28 6.28a.75.75 0 111.06-1.06l1.9 1.9 5.97-6.19a.75.75 0 011.06-.02z" />
      </svg>
    </span>
  );
}

export function WhatsAppHero() {
  const { chatBubbles, sessionCard } = hero;

  return (
    <section className="relative min-h-[calc(100dvh-72px)] bg-luxury-black border-b border-luxury-border">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[70vh]">
          <div className="space-y-8">
            <div className="space-y-5 max-w-lg">
              <p className="section-eyebrow">International Tele Communications</p>
              <h1 className="heading-hero">{hero.title}</h1>
              <p className="text-lg text-luxury-gray leading-relaxed">{hero.subtitle}</p>
              <Link href={hero.ctaPrimaryHref} className="btn-download lg:hidden">
                <DownloadIcon />
                {hero.ctaPrimary}
              </Link>
              <p className="text-xs text-luxury-gray-dim hidden lg:block">{hero.disclaimer}</p>
            </div>

            <div className="relative max-w-sm ml-auto lg:ml-12 space-y-3">
              <div className="chat-bubble-out max-w-[240px] ml-auto">
                <span>{chatBubbles.outgoing.text}</span>
                <span className="float-right ml-2 text-[10px] text-luxury-gray-dim">
                  <CheckMarks />
                </span>
              </div>
              <div className="chat-bubble-in max-w-[260px]">
                <p className="text-xs font-medium text-white mb-0.5">{chatBubbles.incoming.name}</p>
                <span>{chatBubbles.incoming.text}</span>
                <div className="flex gap-1 mt-2">
                  {chatBubbles.incoming.reactions.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-luxury-elevated border border-luxury-border text-xs"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="glass-panel w-full max-w-md p-8 md:p-10 space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-display font-light text-white">{sessionCard.title}</h2>
                <p className="text-luxury-gray">{sessionCard.subtitle}</p>
              </div>
              <p className="text-[11px] text-luxury-gray-dim text-center leading-relaxed">
                {sessionCard.disclaimer}
              </p>
              <div className="flex rounded-pill bg-luxury-black border border-luxury-border overflow-hidden">
                <div className="flex items-center gap-1 px-4 py-3 border-r border-luxury-border text-sm text-luxury-gray shrink-0">
                  <span>🇺🇸</span>
                  <span>+1</span>
                </div>
                <input
                  type="tel"
                  placeholder="Phone number"
                  className="flex-1 px-4 py-3 text-sm text-white bg-transparent outline-none min-w-0 placeholder:text-luxury-gray-dim"
                  aria-label="Phone number"
                />
              </div>
              <Link
                href={hero.ctaPrimaryHref}
                className="flex w-full items-center justify-center gap-2 rounded-pill border border-white/20 bg-white text-luxury-black py-3.5 font-medium hover:bg-luxury-accent transition"
              >
                {sessionCard.cta}
                <span aria-hidden>›</span>
              </Link>
              <p className="text-center text-sm text-luxury-gray">
                {sessionCard.loginPrompt}{" "}
                <Link href={hero.ctaSecondaryHref} className="text-white underline">
                  {sessionCard.loginLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
