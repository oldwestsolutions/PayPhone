import { PageHero } from "@/components/PageHero";
import Link from "next/link";

export const metadata = { title: "Support" };

const sections = [
  {
    id: "billing",
    title: "Billing & payments",
    body: "View and pay your bill online. AutoPay earns a $2 monthly courtesy credit on Heritage plans.",
  },
  {
    id: "faults",
    title: "Report a fault",
    body: "Line test, fiber sync, and engineer dispatch. Priority slots for Heritage Unlimited within four hours.",
  },
  {
    id: "moving",
    title: "Moving home",
    body: "Take your number with you. We coordinate cease-and-provide with your previous carrier.",
  },
  {
    id: "accessibility",
    title: "Accessibility",
    body: "TRS (711 relay), bill formats in braille, and text relay compatible with FCC guidance.",
  },
  {
    id: "regulatory",
    title: "Regulatory",
    body: "Old West Solutions LLC is the operating company behind this demo. PP-2847-US is an illustrative registration-style identifier, not issued by the FCC or any regulator.",
  },
  {
    id: "stores",
    title: "Find a shop",
    body: "Flagship at 1010 Pine Street, St. Louis. Regional partners listed when our store locator API is live.",
  },
];

export default function SupportPage() {
  return (
    <>
      <PageHero
        eyebrow="Customer center"
        title="How may we direct your call?"
        subtitle="Answers, billing, and engineer visits—without waiting on hold behind a synthesized violin."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {sections.map((s) => (
              <article key={s.id} id={s.id} className="card-luxury p-8 scroll-mt-28">
                <h2 className="font-display text-2xl text-navy">{s.title}</h2>
                <p className="mt-3 text-sm text-slate-uk leading-relaxed">{s.body}</p>
              </article>
            ))}
          </div>
          <aside className="space-y-6">
            <div className="card-luxury p-6 bg-navy text-white">
              <h3 className="font-display text-xl">Call us</h3>
              <p className="mt-4 font-display text-3xl text-copper-light">1-800-728-4663</p>
              <p className="mt-2 text-xs text-white/50">Toll-free from US landlines & mobiles</p>
            </div>
            <div className="card-luxury p-6">
              <h3 className="font-display text-xl">Live chat</h3>
              <p className="mt-2 text-sm text-slate-uk">
                Chat opens when backend services are connected. For now, browse the{" "}
                <Link href="/directory" className="text-crimson hover:underline">
                  directory
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
