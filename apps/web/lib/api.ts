import { getOrCreateIdentity, signHttpRequest } from "./did";

type Identity = ReturnType<typeof getOrCreateIdentity>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "default";

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ApiFetchInit = Omit<RequestInit, "body"> & {
  identity: Identity;
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit
): Promise<T> {
  const { identity, ...rest } = init;
  const url = apiUrl(path);
  const u = new URL(url);
  const pathname = u.pathname;
  const method = (rest.method ?? "GET").toUpperCase();
  const bodyStr =
    typeof rest.body === "string"
      ? rest.body
      : rest.body !== undefined && rest.body !== null
        ? JSON.stringify(rest.body)
        : "";

  const ts = String(Date.now());
  const signature = await signHttpRequest({
    secretKey: identity.secretKey,
    timestampMs: ts,
    method,
    path: pathname,
    body: method === "GET" || method === "HEAD" ? "" : bodyStr,
  });

  const headers = new Headers(rest.headers);
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-DID", identity.did);
  headers.set("X-Signature", signature);
  headers.set("X-Timestamp", ts);
  headers.set("X-Tenant-Id", TENANT);

  const res = await fetch(url, {
    ...rest,
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : bodyStr || undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export { getOrCreateIdentity, API_BASE, TENANT };
