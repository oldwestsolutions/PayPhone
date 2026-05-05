import { Redis } from "ioredis";
import { config } from "./config.js";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  }
  return client;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const r = getRedis();
  const raw = await r.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<void> {
  const r = getRedis();
  await r.set(key, JSON.stringify(value), "EX", ttlSec);
}
