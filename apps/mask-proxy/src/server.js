import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MASK_PROXY_PORT || 4010);
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/** In-memory active masked sessions (demo / dev reverse-proxy stand-in). */
const sessions = new Map();

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payphone-mask-proxy", sessions: sessions.size });
});

/**
 * Outbound call routed through Payphone mask proxy.
 * Callee sees masked_from only — real mobile never leaves the proxy.
 */
app.post("/v1/calls/masked", (req, res) => {
  const { stellar_username, circle_wallet_id, masked_from, to_number } = req.body || {};

  if (!stellar_username || !masked_from || !to_number) {
    return res.status(400).json({
      error: "stellar_username, masked_from, and to_number are required",
    });
  }

  const sessionId = `mask-${randomUUID()}`;
  const record = {
    session_id: sessionId,
    stellar_username,
    circle_wallet_id: circle_wallet_id || null,
    masked_from,
    to_number,
    status: "connected",
    created_at: new Date().toISOString(),
  };
  sessions.set(sessionId, record);

  res.json({
    session_id: sessionId,
    masked_from,
    status: "connected",
    message: `Masked call active via Payphone proxy. Callee sees ${masked_from} — your real number is hidden.`,
  });
});

app.post("/v1/calls/:sessionId/end", (req, res) => {
  const { sessionId } = req.params;
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    return res.json({ ok: true, session_id: sessionId, status: "ended" });
  }
  res.status(404).json({ error: "session not found" });
});

app.listen(PORT, () => {
  console.log(`Payphone mask proxy listening on http://localhost:${PORT}`);
});
