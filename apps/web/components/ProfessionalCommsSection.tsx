import Link from "next/link";
import { PhoneIllustration } from "@/components/PhoneIllustration";
import { professionalComms } from "@/lib/content";

export function ProfessionalCommsSection() {
  const c = professionalComms;

  return (
    <section
      id="whitepaper"
      className="relative min-h-[85vh] flex items-center scroll-mt-24 overflow-hidden bg-cream"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(184,115,51,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 md:py-28 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Illustration column */}
          <div className="relative flex justify-center lg:justify-end order-2 lg:order-1">
            <div className="relative w-full max-w-[min(100%,380px)]">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-navy/5 via-transparent to-copper/10 blur-2xl" aria-hidden />
              <PhoneIllustration className="relative w-full h-auto drop-shadow-2xl" />
            </div>
          </div>

          {/* Copy column */}
          <div className="space-y-6 md:space-y-8 order-1 lg:order-2">
            <p className="section-label">{c.eyebrow}</p>
            <h2 className="heading-display text-3xl sm:text-4xl md:text-5xl leading-tight">
              {c.title}
            </h2>
            <div className="rule-gold" />
            <p className="text-base md:text-lg text-slate-uk leading-relaxed">{c.lead}</p>
            <p className="text-sm text-slate-uk leading-relaxed">{c.body}</p>

            <ul className="grid sm:grid-cols-2 gap-3 pt-2">
              {c.features.map((f) => (
                <li
                  key={f}
                  className="flex gap-2 text-sm text-navy rounded-2xl border border-navy/10 bg-white px-4 py-3 shadow-card"
                >
                  <span className="text-crimson shrink-0 font-bold">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-copper/25 bg-cream-warm/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-copper mb-3">
                Ideal for
              </p>
              <ul className="flex flex-wrap gap-2">
                {c.idealFor.map((item) => (
                  <li
                    key={item}
                    className="text-xs text-slate-uk rounded-full border border-navy/10 bg-white px-3 py-1.5"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link href={c.ctaHref} className="btn-primary inline-flex mt-2">
              {c.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
