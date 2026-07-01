import Link from "next/link";
import type { DirectoryEntry } from "@/lib/content";

export function DirectoryCard({ entry }: { entry: DirectoryEntry }) {
  return (
    <article className="feature-card flex flex-col gap-4 h-full">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="text-xl font-medium text-wa-dark">{entry.displayName}</h2>
          <p className="text-xs text-wa-teal mt-1">{entry.title}</p>
        </div>
        <span
          className={
            entry.availability === "Available"
              ? "text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full"
              : "text-[10px] font-semibold text-wa-muted bg-wa-cream px-2 py-1 rounded-full"
          }
        >
          {entry.availability}
        </span>
      </div>
      <p className="text-sm text-wa-muted leading-relaxed line-clamp-4 flex-1">{entry.bio}</p>
      <div className="text-xs text-wa-muted space-y-1">
        <p>
          ★ {entry.rating} · {entry.reviews} reviews · {entry.verification}
        </p>
        <p className="font-medium text-wa-dark">{entry.rateLabel}</p>
      </div>
      <Link
        href={`/directory/${entry.id}`}
        className="text-sm font-medium text-wa-teal hover:underline"
      >
        View profile →
      </Link>
    </article>
  );
}
