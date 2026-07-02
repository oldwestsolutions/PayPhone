/**
 * Intent engine shim — same REST API as Haskell intent-engine (port 4008).
 */
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import {
  validateRawIntent,
  supportedPairsList,
} from "../intent-engine/lib/intent-core.mjs";

const PORT = Number(process.env.INTENT_PORT || 4008);
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const intents = new Map();

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payphone-intent-engine" });
});

app.get("/v1/intent/supported-pairs", (_req, res) => {
  res.json({ ok: true, data: supportedPairsList() });
});

app.post("/v1/intent/validate", (req, res) => {
  const result = validateRawIntent(req.body || {}, `dry-${Date.now()}`);
  if (!result.ok) {
    return res.json({ valid: false, canonical: null, error: result.error });
  }
  return res.json({ valid: true, canonical: result.canonical, error: null });
});

app.post("/v1/intent/submit", (req, res) => {
  const intentId = `intent-${randomUUID()}`;
  const result = validateRawIntent(req.body || {}, intentId);
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  const record = {
    intent_id: intentId,
    raw_intent: req.body,
    canonical_intent: result.canonical,
    validation_error: null,
    status: "validated",
    submitted_by: result.canonical.submittedBy,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  intents.set(intentId, record);
  return res.status(201).json({ ok: true, data: result.canonical });
});

app.get("/v1/intent/:id", (req, res) => {
  const record = intents.get(req.params.id);
  if (!record) return res.status(404).json({ ok: false, error: "Intent not found" });
  return res.json({ ok: true, data: record.canonical_intent, status: record.status });
});

app.listen(PORT, () => {
  console.log(`Payphone intent engine listening on http://localhost:${PORT}`);
});
