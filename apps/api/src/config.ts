import "./crypto/nobleSetup.js";
import "dotenv/config";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: num(process.env.PORT, 4000),
  mongoUri:
    process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/payphone",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  /** Max age (ms) for signed requests */
  maxSignatureAgeMs: num(process.env.MAX_SIGNATURE_AGE_MS, 120_000),
  /** Reputation cache TTL — keep short for fresher scores */
  reputationCacheTtlSec: num(process.env.REPUTATION_CACHE_TTL_SEC, 15),
  /** Session duration consensus window (seconds) */
  consensusWindowSec: num(process.env.CONSENSUS_WINDOW_SEC, 5),
  tenantsJson: process.env.TENANTS_JSON ?? "",
};

export type TenantConfig = {
  id: string;
  reputationReaderUrl: string;
  settlementAddress: string;
  minReputation: number;
  accentColor?: string;
  displayName?: string;
};

function parseTenants(raw: string): Map<string, TenantConfig> {
  const map = new Map<string, TenantConfig>();
  if (!raw.trim()) {
    map.set("default", {
      id: "default",
      reputationReaderUrl:
        process.env.DEFAULT_REPUTATION_READER_URL ??
        "http://127.0.0.1:4000/internal/mock-reputation",
      settlementAddress:
        process.env.DEFAULT_SETTLEMENT_ADDRESS ??
        "0x000000000000000000000000000000000000dEaD",
      minReputation: num(process.env.DEFAULT_MIN_REPUTATION, 0),
      displayName: "Default Ecosystem",
    });
    return map;
  }
  const obj = JSON.parse(raw) as Record<string, Omit<TenantConfig, "id">>;
  for (const [id, t] of Object.entries(obj)) {
    map.set(id, { id, ...t });
  }
  return map;
}

let _tenants: Map<string, TenantConfig> | null = null;

export function getTenants(): Map<string, TenantConfig> {
  if (!_tenants) {
    _tenants = parseTenants(config.tenantsJson);
  }
  return _tenants;
}

export function getTenant(id: string): TenantConfig | undefined {
  return getTenants().get(id) ?? getTenants().get("default");
}
