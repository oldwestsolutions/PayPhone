/**
 * Ledger service — port 4012
 */
import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";
import { LedgerService } from "./src/ledger.mjs";

const PORT = Number(process.env.LEDGER_PORT || 4012);
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/payphone";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let ledger;

async function init() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db();
  await db.collection("execution_events").createIndex({ event_id: 1 }, { unique: true });
  await db.collection("execution_events").createIndex({ intent_id: 1 });
  await db.collection("execution_events").createIndex({ execution_id: 1 });
  ledger = new LedgerService(db.collection("execution_events"));
  await ledger.loadLastHashes();
  console.log("[ledger] connected to MongoDB");
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payphone-ledger-service" });
});

app.post("/v1/ledger/record", async (req, res) => {
  try {
    const event = await ledger.record(req.body || {});
    return res.status(201).json({ ok: true, eventId: event.event_id, hash: event.hash });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/v1/ledger/intent/:intentId", async (req, res) => {
  const chain = await ledger.getChain(req.params.intentId);
  return res.json({ ok: true, data: chain });
});

app.get("/v1/ledger/execution/:executionId", async (req, res) => {
  const events = await ledger.recent(500, { execution_id: req.params.executionId });
  return res.json({ ok: true, data: events.reverse() });
});

app.get("/v1/ledger/verify/:intentId", async (req, res) => {
  const result = await ledger.verifyChain(req.params.intentId);
  return res.json({ ok: true, data: result });
});

app.get("/v1/ledger/recent", async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const data = await ledger.recent(limit);
  return res.json({ ok: true, data });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Payphone ledger service listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("[ledger] failed to start:", e.message);
    process.exit(1);
  });
