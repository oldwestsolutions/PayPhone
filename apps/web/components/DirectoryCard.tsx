import Link from "next/link";
import type { DirectoryEntry } from "@/lib/content";

export function DirectoryCard({ entry }: { entry: DirectoryEntry }) {
  return (
    <article className="card-luxury p-6 flex flex-col gap-4 h-full">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="font-display text-xl text-navy">{entry.displayName}</h2>
          <p className="text-xs text-copper mt-1 uppercase tracking-wide">{entry.title}</p>
        </div>
        <span
          className={
            entry.availability === "Available"
              ? "text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full"
              : "text-[10px] font-semibold uppercase tracking-wide text-slate-uk bg-cream-warm px-2 py-1 rounded-full"
          }
        >
          {entry.availability}
        </span>
      </div>
      <p className="text-sm text-slate-uk leading-relaxed line-clamp-4 flex-1">{entry.bio}</p>
      <div className="text-xs text-slate-soft space-y-1">
        <p>
          ★ {entry.rating} · {entry.reviews} reviews · {entry.verification}
        </p>
        <p className="font-medium text-navy">{entry.rateLabel}</p>
      </div>
      <Link
        href={`/directory/${entry.id}`}
        className="text-xs font-semibold uppercase tracking-corporate text-crimson hover:text-crimson-bright"
      >
        View profile →
      </Link>
    </article>
  );
}
