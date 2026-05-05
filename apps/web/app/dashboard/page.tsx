"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useIdentityOptional } from "@/components/IdentityProvider";

export default function DashboardPage() {
  const identity = useIdentityOptional();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [earnings, setEarnings] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    displayName: "New provider",
    bio: "",
    ratePerSecond: "500",
    maxDurationSec: 3600,
    walletAddress: "0x4200000000000000000000000000000000000006",
    availabilityOnline: true,
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) return;
    let c = false;
    (async () => {
      try {
        const e = await apiFetch<Record<string, unknown>>("/dashboard/earnings", {
          identity,
        });
        if (!c) setEarnings(e);
      } catch {
        /* optional */
      }
      try {
        const p = await apiFetch<Record<string, unknown>>("/dashboard/profile", {
          identity,
        });
        if (!c) setProfile(p);
      } catch {
        if (!c) setProfile(null);
      }
    })();
    return () => {
      c = true;
    };
  }, [identity]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setMsg(null);
    try {
      await apiFetch("/dashboard/profile", {
        method: "PUT",
        identity,
        body: form,
      });
      setMsg("Saved");
      const p = await apiFetch<Record<string, unknown>>("/dashboard/profile", {
        identity,
      });
      setProfile(p);
    } catch (err) {
      setMsg(String(err));
    }
  }

  if (!identity) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Provider dashboard</h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
          Link your DID to ecosystem reputation off-chain; payphone only reads
          scores for gating. Settlement wallets and on-chain flows are your
          custody policy.
        </p>
      </div>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-card p-5 space-y-3">
          <h2 className="font-medium text-zinc-100">Profile</h2>
          {profile ? (
            <pre className="text-xs text-zinc-400 overflow-auto max-h-48">
              {JSON.stringify(profile, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">No profile yet — publish below.</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-card p-5 space-y-3">
          <h2 className="font-medium text-zinc-100">Earnings / calls</h2>
          {earnings ? (
            <pre className="text-xs text-zinc-400 overflow-auto max-h-48">
              {JSON.stringify(earnings, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">No history yet.</p>
          )}
        </div>
      </section>

      <form
        onSubmit={(e) => void saveProfile(e)}
        className="rounded-xl border border-zinc-800 bg-card p-5 space-y-4 max-w-xl"
      >
        <h2 className="font-medium text-zinc-100">Publish listing</h2>
        <label className="block text-sm">
          <span className="text-zinc-400">Display name</span>
          <input
            className="mt-1 w-full rounded-md bg-black/40 border border-zinc-800 px-3 py-2 text-sm"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Bio</span>
          <textarea
            className="mt-1 w-full rounded-md bg-black/40 border border-zinc-800 px-3 py-2 text-sm"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Rate per second (wei / smallest unit)</span>
          <input
            className="mt-1 w-full rounded-md bg-black/40 border border-zinc-800 px-3 py-2 font-mono text-sm"
            value={form.ratePerSecond}
            onChange={(e) => setForm({ ...form, ratePerSecond: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Max duration (seconds)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-black/40 border border-zinc-800 px-3 py-2 font-mono text-sm"
            value={form.maxDurationSec}
            onChange={(e) =>
              setForm({ ...form, maxDurationSec: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Settlement wallet</span>
          <input
            className="mt-1 w-full rounded-md bg-black/40 border border-zinc-800 px-3 py-2 font-mono text-sm"
            value={form.walletAddress}
            onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.availabilityOnline}
            onChange={(e) =>
              setForm({ ...form, availabilityOnline: e.target.checked })
            }
          />
          Show as online
        </label>
        {msg && <p className="text-sm text-accent">{msg}</p>}
        <button
          type="submit"
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
