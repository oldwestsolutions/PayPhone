import "./nobleSetup.js";
import { verify } from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes, bytesToHex } from "@noble/hashes/utils.js";

function b64urlDecode(s: string): Uint8Array {
  const pad = 4 - (s.length % 4 || 4);
  const b64 = (s + "=".repeat(pad === 4 ? 0 : pad))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const bin = Buffer.from(b64, "base64");
  return new Uint8Array(bin);
}

function b64urlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Canonical signing payload — no PII, stable for proxies */
export function buildSignPayload(parts: {
  timestampMs: string;
  method: string;
  path: string;
  body: string;
}): Uint8Array {
  const bodyHash = bytesToHex(sha256(utf8ToBytes(parts.body)));
  const msg = `${parts.timestampMs}.${parts.method.toUpperCase()}.${parts.path}.${bodyHash}`;
  return utf8ToBytes(msg);
}

export function parseDidPublicKey(didHeader: string): Uint8Array | null {
  try {
    const raw = b64urlDecode(didHeader.trim());
    if (raw.length === 32) return raw;
    return null;
  } catch {
    return null;
  }
}

export function verifyDidSignature(args: {
  publicKeyB64Url: string;
  signatureB64Url: string;
  timestampMs: string;
  method: string;
  path: string;
  body: string;
}): boolean {
  const pub = parseDidPublicKey(args.publicKeyB64Url);
  if (!pub) return false;
  let sig: Uint8Array;
  try {
    sig = b64urlDecode(args.signatureB64Url.trim());
  } catch {
    return false;
  }
  if (sig.length !== 64) return false;
  const payload = buildSignPayload({
    timestampMs: args.timestampMs,
    method: args.method,
    path: args.path,
    body: args.body,
  });
  try {
    return verify(sig, payload, pub);
  } catch {
    return false;
  }
}

export function verifyRawMessage(args: {
  publicKeyB64Url: string;
  signatureB64Url: string;
  messageUtf8: string;
}): boolean {
  const pub = parseDidPublicKey(args.publicKeyB64Url);
  if (!pub) return false;
  let sig: Uint8Array;
  try {
    sig = b64urlDecode(args.signatureB64Url.trim());
  } catch {
    return false;
  }
  if (sig.length !== 64) return false;
  const payload = utf8ToBytes(args.messageUtf8);
  try {
    return verify(sig, payload, pub);
  } catch {
    return false;
  }
}

export { b64urlEncode };
