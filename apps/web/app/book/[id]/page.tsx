"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useIdentityOptional } from "@/components/IdentityProvider";

type Profile = {
  ratePerSecond: string;
  maxDurationSec: number;
  providerId: string;
  displayName: string;
};

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = String(params?.id ?? "");
  const identity = useIdentityOptional();
  const [duration, setDuration] = useState(600);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!identity || !providerId) return;
    let c = false;
    (async () => {
      try {
        const p = await apiFetch<Profile>(`/providers/${providerId}`, {
          identity,
        });
        if (!c) {
          setProfile(p);
          setDuration(Math.min(600, p.maxDurationSec));
        }
      } catch (e) {
        if (!c) setErr(String(e));
      }
    })();
    return () => {
      c = true;
    };
  }, [identity, providerId]);

  const rate = profile?.ratePerSecond ?? "0";
  const maxDur = profile?.maxDurationSec ?? 3600;

  const gross = BigInt(rate || "0") * BigInt(duration);
  const platform = (gross * 5n) / 100n;
  const escrowHint = gross + platform;

  async function onBook() {
    if (!identity || !profile) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{
        sessionId: string;
        signalingWsPath: string;
        consensusWindowSec: number;
      }>("/sessions", {
        method: "POST",
        identity,
        body: {
          providerId,
          ratePerSecond: profile.ratePerSecond,
          maxDurationSec: Math.min(duration, profile.maxDurationSec),
        },
      });
      router.push(`/call/${res.sessionId}`);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!identity) return <p className="text-zinc-500">Loading…</p>;
  if (err && !profile) return <p className="text-red-400">{err}</p>;
  if (!profile) return <p className="text-zinc-500">Loading provider…</p>;

  return (
    <div className="max-w-lg space-y-6">
      <Link href={`/providers/${providerId}`} className="text-sm text-zinc-500">
        ← {profile.displayName}
      </Link>
      <h1 className="text-2xl font-semibold">Book session</h1>
      <p className="text-sm text-zinc-400">
        On-chain escrow should lock funds for the previewed total before you
        start media. The MVP API records intent; wire your custody / contract
        hash into <code className="text-xs">escrowTxHash</code> when ready.
      </p>
      <label className="block text-sm text-zinc-400">
        Duration (seconds)
        <input
          type="number"
          className="mt-1 w-full rounded-md bg-black/40 border border-zinc-800 px-3 py-2 font-mono text-sm"
          value={duration}
          min={60}
          max={maxDur}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </label>
      <div className="rounded-lg border border-zinc-800 bg-card p-4 text-sm space-y-1">
        <div>
          Rate:{" "}
          <span className="font-mono text-accent">{profile.ratePerSecond}</span>{" "}
          / sec
        </div>
        <div>
          Gross:{" "}
          <span className="font-mono text-accent">{gross.toString()}</span>
        </div>
        <div>
          +5% platform buffer:{" "}
          <span className="font-mono">{platform.toString()}</span>
        </div>
        <div className="text-zinc-200 pt-2 font-medium">
          Escrow target:{" "}
          <span className="font-mono text-accent">{escrowHint.toString()}</span>
        </div>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button
        type="button"
        onClick={() => void onBook()}
        disabled={busy}
        className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {busy ? "Creating session…" : "Create session & enter call"}
      </button>
    </div>
  );
}
