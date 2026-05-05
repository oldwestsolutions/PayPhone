"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useIdentityOptional } from "@/components/IdentityProvider";

type Rep = {
  score: number;
  reviewCount: number;
  verificationStatus: string;
};

type Row = {
  providerId: string;
  displayName: string;
  bio: string;
  ratePerSecond: string;
  maxDurationSec: number;
  availabilityOnline: boolean;
  reputation: Rep;
};

export function MarketplaceBody() {
  const id = useIdentityOptional();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ providers: Row[] }>("/providers", {
          identity: id,
        });
        if (!cancelled) setRows(data.providers);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <p className="text-zinc-500">Loading identity…</p>;
  if (err) return <p className="text-red-400">Marketplace error: {err}</p>;
  if (!rows) return <p className="text-zinc-500">Loading providers…</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((p) => (
        <article
          key={p.providerId}
          className="rounded-xl border border-zinc-800 bg-card p-5 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-medium text-zinc-50">{p.displayName}</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Rep {p.reputation.score} · {p.reputation.reviewCount} reviews ·{" "}
                {p.reputation.verificationStatus}
              </p>
            </div>
            <span
              className={
                p.availabilityOnline
                  ? "text-emerald-400 text-xs"
                  : "text-zinc-500 text-xs"
              }
            >
              {p.availabilityOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="text-sm text-zinc-400 line-clamp-4">{p.bio}</p>
          <div className="text-sm text-zinc-300">
            Rate{" "}
            <span className="text-accent font-mono">{p.ratePerSecond}</span> wei/s ·
            max {p.maxDurationSec}s
          </div>
          <div className="flex gap-2 mt-auto pt-2">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
              href={`/providers/${p.providerId}`}
            >
              View profile
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
              href={`/book/${p.providerId}`}
            >
              Book
            </Link>
          </div>
        </article>
      ))}
      {rows.length === 0 && (
        <p className="text-zinc-500 col-span-full">
          No visible providers for your tenant. Seed or register a profile in the
          dashboard.
        </p>
      )}
    </div>
  );
}
