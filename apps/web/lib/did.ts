import "./nobleSetup";
import { getPublicKey, sign } from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

const STORAGE_KEY = "payphone_ed25519_sk";

function b64urlEncode(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeDidPublicKey(publicKey: Uint8Array): string {
  return b64urlEncode(publicKey);
}

export function getOrCreateIdentity(): {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  did: string;
} {
  if (typeof window === "undefined") {
    throw new Error("identity only in browser");
  }
  const existing = localStorage.getItem(STORAGE_KEY);
  let secretKey: Uint8Array;
  if (existing) {
    secretKey = Uint8Array.from(JSON.parse(existing) as number[]);
  } else {
    secretKey = ed25519RandomSecret();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(secretKey)));
  }
  const publicKey = getPublicKey(secretKey);
  return { secretKey, publicKey, did: encodeDidPublicKey(publicKey) };
}

function ed25519RandomSecret(): Uint8Array {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return b;
}

export async function signHttpRequest(parts: {
  secretKey: Uint8Array;
  timestampMs: string;
  method: string;
  path: string;
  body: string;
}): Promise<string> {
  const bodyHash = bytesToHex(sha256(utf8ToBytes(parts.body)));
  const msg = `${parts.timestampMs}.${parts.method.toUpperCase()}.${parts.path}.${bodyHash}`;
  const sig = sign(utf8ToBytes(msg), parts.secretKey);
  return b64urlEncode(sig);
}

export async function signWsAuth(parts: {
  secretKey: Uint8Array;
  sessionId: string;
  role: "client" | "provider";
  timestampMs: string;
}): Promise<string> {
  const msg = `ws.auth.${parts.sessionId}.${parts.role}.${parts.timestampMs}`;
  const sig = sign(utf8ToBytes(msg), parts.secretKey);
  return b64urlEncode(sig);
}
