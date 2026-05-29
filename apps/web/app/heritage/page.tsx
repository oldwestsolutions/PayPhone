import { PageHero } from "@/components/PageHero";
import { heritageTimeline } from "@/lib/content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heritage & whitepaper",
  description:
    "From Southwestern Bell to payphone.cc—Old West Solutions LLC and the dumb-relay philosophy.",
};

export default function HeritagePage() {
  return (
    <>
      <PageHero
        eyebrow="Old West Solutions LLC"
        title="Heritage & whitepaper"
        subtitle="Bell System craft meets modern WebRTC—anonymous professional comms without a central trust ledger."
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="relative border-l-2 border-copper/40 pl-8 space-y-12">
            {heritageTimeline.map((item) => (
              <div key={item.year} className="relative">
                <span className="absolute -left-[2.55rem] flex h-4 w-4 rounded-full bg-crimson ring-4 ring-cream" />
                <p className="font-display text-3xl text-copper">{item.year}</p>
                <p className="mt-2 text-sm text-slate-uk leading-relaxed">{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-navy text-white text-center">
        <div className="mx-auto max-w-xl px-4 space-y-4">
          <p className="text-sm text-white/60">
            Full whitepaper v1.0 on the home page—executive summary through business model.
          </p>
          <a href="/#whitepaper" className="btn-ghost-light inline-flex">
            Read on homepage
          </a>
        </div>
      </section>
    </>
  );
}
