/**
 * Routing engine shim — port 4009 (Rust replacement uses same API).
 */
import cors from "cors";
import express from "express";
import { evaluateIntent, quickQuote } from "./lib/routing-core.mjs";

const PORT = Number(process.env.ROUTING_PORT || 4009);
const INTENT_URL = (process.env.INTENT_ENGINE_URL || "http://localhost:4008").replace(/\/$/, "");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const routePlans = new Map();

async function fetchIntent(intentId) {
  const res = await fetch(`${INTENT_URL}/v1/intent/${intentId}`);
  if (!res.ok) throw new Error(`Intent ${intentId} not found`);
  const body = await res.json();
  return body.data;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payphone-routing-engine" });
});

app.get("/v1/routes/providers/status", (_req, res) => {
  res.json({
    circle: "online",
    uniswap_v3: process.env.POLYGON_RPC_URL ? "online" : "online",
    stellar_sdex: "online",
    btc_bridge: process.env.PAYPHONE_BTCPAY_URL ? "online" : "degraded",
  });
});

app.post("/v1/routes/quote", (req, res) => {
  try {
    const { assetIn, assetOut, amount } = req.body || {};
    if (!assetIn || !assetOut || !amount) {
      return res.status(400).json({ error: "assetIn, assetOut, and amount are required" });
    }
    return res.json({ ok: true, data: quickQuote(assetIn, assetOut, amount) });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

app.post("/v1/routes/evaluate", async (req, res) => {
  try {
    const intentId = String(req.body?.intentId || "").trim();
    if (!intentId) return res.status(400).json({ error: "intentId is required" });

    const intent = req.body?.canonicalIntent || (await fetchIntent(intentId));
    const plan = evaluateIntent(intent);
    routePlans.set(plan.route_plan_id, plan);
    return res.status(201).json({ ok: true, data: plan });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

app.get("/v1/routes/:id", (req, res) => {
  const plan = routePlans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: "Route plan not found" });
  return res.json({ ok: true, data: plan });
});

app.listen(PORT, () => {
  console.log(`Payphone routing engine listening on http://localhost:${PORT}`);
});
