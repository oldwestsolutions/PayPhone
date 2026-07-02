"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { PageHero } from "@/components/PageHero";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

const gatewayUrl = process.env.NEXT_PUBLIC_PAYPHONE_GATEWAY_URL || "http://localhost:4000";

export default function AccountPage() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "register") {
        const resp = await fetch(`${gatewayUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, phone, username }),
        });
        const body = await resp.json();
        if (!resp.ok) throw new Error(body.error || "Registration failed");
        setSuccess("Account created. Download the desktop app and sign in with your email and password.");
      } else {
        const sb = getSupabase();
        if (sb) {
          const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          setSuccess("Signed in. Open the Payphone desktop app to place calls and manage payments.");
        } else {
          const resp = await fetch(`${gatewayUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const body = await resp.json();
          if (!resp.ok) throw new Error(body.error || "Login failed");
          setSuccess(`Welcome back, @${body.data?.user?.username}. Open the desktop app to continue.`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Create your Payphone line"
        subtitle="Register with email and phone number. Only verified accounts can use calls, escrow, procurement, and USDC payments."
      />

      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              className={`flex-1 py-2 rounded-full text-sm font-semibold ${mode === "register" ? "bg-white text-black" : "border border-luxury-border text-luxury-gray"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-full text-sm font-semibold ${mode === "login" ? "bg-white text-black" : "border border-luxury-border text-luxury-gray"}`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
          </div>

          <form className="card-luxury p-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="text-slate-uk">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-copper bg-white text-black"
              />
            </label>
            {mode === "register" && (
              <>
                <label className="block text-sm">
                  <span className="text-slate-uk">Mobile number</span>
                  <input
                    type="tel"
                    required
                    placeholder="+1..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-copper bg-white text-black"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-uk">Stellar username (7–22 chars, include a number)</span>
                  <input
                    type="text"
                    required
                    placeholder="alex.42line"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-copper bg-white text-black"
                  />
                </label>
              </>
            )}
            <label className="block text-sm">
              <span className="text-slate-uk">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-copper bg-white text-black"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "…" : mode === "register" ? "Create account" : "Sign in"}
            </button>
            <p className="text-xs text-center text-slate-soft">
              <Link href="/download" className="text-copper hover:underline">
                Download the desktop app
              </Link>{" "}
              after registering.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
