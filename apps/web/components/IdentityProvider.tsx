"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateIdentity } from "@/lib/did";

type Identity = ReturnType<typeof getOrCreateIdentity>;

type Ctx = {
  identity: Identity | null;
  refresh: () => void;
};

const IdentityContext = createContext<Ctx | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      setIdentity(getOrCreateIdentity());
    } catch {
      setIdentity(null);
    }
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  return (
    <IdentityContext.Provider value={{ identity, refresh }}>
      <div className="mb-6 rounded-lg border border-zinc-800 bg-card px-4 py-3 text-sm text-zinc-300 flex flex-wrap items-center gap-3">
        <span className="text-zinc-500">Active DID (ed25519)</span>
        {identity ? (
          <code className="text-xs break-all text-accent">{identity.did}</code>
        ) : (
          <span>Unavailable (SSR)</span>
        )}
      </div>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): Identity {
  const ctx = useContext(IdentityContext);
  if (!ctx?.identity) {
    throw new Error("Identity required");
  }
  return ctx.identity;
}

export function useIdentityOptional(): Identity | null {
  return useContext(IdentityContext)?.identity ?? null;
}
