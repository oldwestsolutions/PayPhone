"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useIdentityOptional } from "@/components/IdentityProvider";

type Profile = {
  providerId: string;
  displayName: string;
  bio: string;
  ratePerSecond: string;
  maxDurationSec: number;
  availabilityOnline: boolean;
  reputation: {
    score: number;
    reviewCount: number;
    verificationStatus: string;
  };
};

export default function ProviderProfilePage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const identity = useIdentityOptional();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!identity || !id) return;
    let c = false;
    (async () => {
      try {
        const data = await apiFetch<Profile>(`/providers/${id}`, {
          identity,
        });
        if (!c) setP(data);
      } catch (e) {
        if (!c) setErr(String(e));
      }
    })();
    return () => {
      c = true;
    };
  }, [identity, id]);

  if (!identity) return <p className="text-zinc-500">Loading…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  if (!p) return <p className="text-zinc-500">Loading profile…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Marketplace
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{p.displayName}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Score {p.reputation.score} · {p.reputation.reviewCount} reviews ·{" "}
          {p.reputation.verificationStatus}
        </p>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed">{p.bio}</p>
      <div className="rounded-lg border border-zinc-800 bg-card p-4 text-sm space-y-2">
        <div>
          Rate: <span className="font-mono text-accent">{p.ratePerSecond}</span>{" "}
          smallest units / sec
        </div>
        <div>Max duration: {p.maxDurationSec}s</div>
        <div>
          Availability:{" "}
          {p.availabilityOnline ? (
            <span className="text-emerald-400">Online</span>
          ) : (
            <span className="text-zinc-500">Offline</span>
          )}
        </div>
      </div>
      <Link
        href={`/book/${p.providerId}`}
        className="inline-flex rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
      >
        Continue to booking
      </Link>
    </div>
  );
}
