import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectoryEntry } from "@/lib/content";

type Props = { params: { id: string } };

export function generateStaticParams() {
  return [
    { id: "mercer-legal" },
    { id: "exchange-concierge" },
    { id: "field-engineer" },
  ];
}

export function generateMetadata({ params }: Props) {
  const entry = getDirectoryEntry(params.id);
  return { title: entry?.displayName ?? "Profile" };
}

export default function DirectoryProfilePage({ params }: Props) {
  const entry = getDirectoryEntry(params.id);
  if (!entry) notFound();

  return (
    <section className="py-16">
      <div className="mx-auto max-w-2xl px-4 space-y-8">
        <Link
          href="/directory"
          className="text-xs font-semibold uppercase tracking-corporate text-slate-soft hover:text-crimson"
        >
          ← Directory
        </Link>

        <header className="space-y-3 border-b border-navy/10 pb-8">
          <p className="section-label">{entry.verification}</p>
          <h1 className="heading-display text-4xl">{entry.displayName}</h1>
          <p className="text-copper text-sm uppercase tracking-wide">{entry.title}</p>
          <p className="text-sm text-slate-uk">
            ★ {entry.rating} · {entry.reviews} reviews · {entry.availability}
          </p>
        </header>

        <p className="text-sm text-slate-uk leading-relaxed">{entry.bio}</p>

        <div className="card-luxury p-6 space-y-2 text-sm">
          <p>
            <span className="text-slate-soft">Rate: </span>
            <span className="font-medium text-navy">{entry.rateLabel}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-copper/40 bg-cream-warm/50 p-6 text-sm text-slate-uk">
          <strong className="text-navy block mb-2">Booking unavailable</strong>
          Live sessions and escrow settlement require backend services that are not yet
          configured. This profile is for demonstration of the luxury directory experience.
        </div>

        <Link href="/support" className="btn-secondary">
          Inquire via customer center
        </Link>
      </div>
    </section>
  );
}
