import type { RequestHandler } from "express";
import { config } from "../config.js";
import { verifyDidSignature } from "../crypto/did.js";

const SKIP_PREFIXES = ["/health", "/internal/"];

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((p) => path.startsWith(p));
}

export const didAuthMiddleware: RequestHandler = (req, res, next) => {
  if (shouldSkip(req.path)) {
    next();
    return;
  }

  const did = req.header("x-did");
  const sig = req.header("x-signature");
  const ts = req.header("x-timestamp");
  if (!did || !sig || !ts) {
    res.status(401).json({
      error: "did_auth_required",
      message: "Missing X-DID, X-Signature, or X-Timestamp",
    });
    return;
  }

  const now = Date.now();
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now - t) > config.maxSignatureAgeMs) {
    res.status(401).json({ error: "stale_timestamp" });
    return;
  }

  const body = req.rawBody ?? "";

  const ok = verifyDidSignature({
    publicKeyB64Url: did,
    signatureB64Url: sig,
    timestampMs: ts,
    method: req.method,
    path: req.originalUrl.split("?")[0] ?? req.path,
    body,
  });

  if (!ok) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  req.didPublicKeyB64 = did;
  next();
};
