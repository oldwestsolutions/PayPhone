import { config, type TenantConfig } from "../config.js";
import { redisGetJson, redisSetJson } from "../redis.js";

export type ReputationView = {
  score: number;
  reviewCount: number;
  verificationStatus: "none" | "pending" | "verified";
};

export async function fetchReputation(
  tenant: TenantConfig,
  did: string
): Promise<ReputationView> {
  const cacheKey = `rep:${tenant.id}:${did}`;
  try {
    const cached = await redisGetJson<ReputationView>(cacheKey);
    if (cached) return cached;
  } catch {
    /* cache optional */
  }

  const url = new URL(tenant.reputationReaderUrl);
  url.searchParams.set("did", did);

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`reputation_reader_failed:${res.status}`);
  }

  const data = (await res.json()) as Partial<ReputationView>;
  const view: ReputationView = {
    score: Number(data.score ?? 0),
    reviewCount: Number(data.reviewCount ?? 0),
    verificationStatus:
      data.verificationStatus === "verified" ||
      data.verificationStatus === "pending"
        ? data.verificationStatus
        : "none",
  };

  try {
    await redisSetJson(cacheKey, view, config.reputationCacheTtlSec);
  } catch {
    /* cache optional */
  }
  return view;
}

export function meetsMinimum(
  rep: ReputationView,
  tenant: TenantConfig
): boolean {
  return rep.score >= tenant.minReputation;
}
