/**
 * Node escrow engine — same REST API as Haskell escrow-engine (port 4004).
 */
import cors from "cors";
import express from "express";

const PORT = Number(process.env.ESCROW_PORT || 4004);
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const store = {
  standard: new Map(),
  marketing: new Map(),
  supplyChain: new Map(),
};

function transitionStandard(c, req) {
  const { requestType, requesterId } = req;
  const okParty = (id) => id === c.buyerId || id === c.sellerId;
  const next = { ...c };
  const key = `${c.status}:${requestType}`;
  const rules = {
    "Draft:fund": () => requesterId === c.buyerId && (next.status = "Funded"),
    "Funded:activate": () => okParty(requesterId) && (next.status = "Active"),
    "Active:request_release": () => requesterId === c.sellerId && (next.status = "ReleasePending"),
    "ReleasePending:settle": () => requesterId === c.buyerId && (next.status = "Settled"),
    "Active:settle_call": () => okParty(requesterId) && (next.status = "Settled"),
    "Active:dispute": () => okParty(requesterId) && (next.status = "Disputed"),
    "Draft:cancel": () => (next.status = "Cancelled"),
    "Funded:cancel": () => requesterId === c.buyerId && (next.status = "Cancelled"),
  };
  if (!rules[key]?.()) {
    throw new Error(`Invalid transition '${requestType}' from ${c.status}`);
  }
  return next;
}

function transitionMarketing(m, req) {
  const { requestType, requesterId } = req;
  const next = { ...m };
  const key = `${m.status}:${requestType}`;
  const rules = {
    "Draft:fund": () => requesterId === m.brandId && (next.status = "Funded"),
    "Funded:activate": () =>
      (requesterId === m.brandId || requesterId === m.creatorId) && (next.status = "Active"),
    "Active:request_release": () => requesterId === m.creatorId && (next.status = "ReleasePending"),
    "ReleasePending:settle": () => requesterId === m.brandId && (next.status = "Settled"),
    "Active:dispute": () =>
      (requesterId === m.brandId || requesterId === m.creatorId) && (next.status = "Disputed"),
    "Draft:cancel": () => (next.status = "Cancelled"),
  };
  if (!rules[key]?.()) {
    throw new Error(`Invalid marketing transition '${requestType}' from ${m.status}`);
  }
  return next;
}

function transitionSupply(s, req) {
  const { requestType, requesterId } = req;
  const next = { ...s };
  const key = `${s.status}:${requestType}`;
  const rules = {
    "Draft:fund": () => requesterId === s.buyerId && (next.status = "Funded"),
    "Funded:activate": () =>
      (requesterId === s.buyerId || requesterId === s.supplierId) && (next.status = "Active"),
    "Active:request_release": () => requesterId === s.supplierId && (next.status = "ReleasePending"),
    "ReleasePending:settle": () => requesterId === s.buyerId && (next.status = "Settled"),
    "Active:dispute": () =>
      (requesterId === s.buyerId || requesterId === s.supplierId) && (next.status = "Disputed"),
    "Draft:cancel": () => (next.status = "Cancelled"),
  };
  if (!rules[key]?.()) {
    throw new Error(`Invalid supply transition '${requestType}' from ${s.status}`);
  }
  return next;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/contracts", (req, res) => {
  const p = req.body || {};
  if (p.buyerBalance < p.amount) {
    return res.status(400).json({ error: "Insufficient wallet balance to back this escrow." });
  }
  const c = {
    contractId: p.contractId,
    buyerId: p.buyerId,
    sellerId: p.sellerId,
    amount: p.amount,
    currency: p.currency,
    status: "Draft",
    buyerBalance: p.buyerBalance,
    minBillableSeconds: p.minBillableSeconds ?? 60,
    ratePerSecond: p.ratePerSecond ?? 0,
    callSessionId: p.callSessionId ?? null,
  };
  store.standard.set(c.contractId, c);
  res.json({ contract: c, error: null });
});

app.get("/contracts/:id", (req, res) => {
  const c = store.standard.get(req.params.id);
  if (!c) return res.status(404).send("Not found");
  res.json({ contract: c, error: null });
});

app.post("/contracts/:id/transition", (req, res) => {
  const c = store.standard.get(req.params.id);
  if (!c) return res.status(400).json({ error: "Contract not found" });
  try {
    const updated = transitionStandard(c, req.body);
    store.standard.set(req.params.id, updated);
    res.json({ contract: updated, error: null });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/marketing", (req, res) => {
  const p = req.body || {};
  if (p.buyerBalance < p.amount) {
    return res.status(400).json({ error: "Insufficient wallet balance for marketing escrow" });
  }
  const m = {
    marketingId: p.marketingId,
    brandId: p.brandId,
    creatorId: p.creatorId,
    campaignName: p.campaignName,
    amount: p.amount,
    status: "Draft",
    buyerBalance: p.buyerBalance,
  };
  store.marketing.set(m.marketingId, m);
  res.json(m);
});

app.post("/marketing/:id/transition", (req, res) => {
  const m = store.marketing.get(req.params.id);
  if (!m) return res.status(400).json({ error: "Marketing escrow not found" });
  try {
    const updated = transitionMarketing(m, req.body);
    store.marketing.set(req.params.id, updated);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/supply-chain", (req, res) => {
  const p = req.body || {};
  if (p.buyerBalance < p.amount) {
    return res.status(400).json({ error: "Insufficient wallet balance for supply chain escrow" });
  }
  const s = {
    supplyId: p.supplyId,
    buyerId: p.buyerId,
    supplierId: p.supplierId,
    sku: p.sku,
    quantity: p.quantity,
    amount: p.amount,
    status: "Draft",
    buyerBalance: p.buyerBalance,
  };
  store.supplyChain.set(s.supplyId, s);
  res.json(s);
});

app.post("/supply-chain/:id/transition", (req, res) => {
  const s = store.supplyChain.get(req.params.id);
  if (!s) return res.status(400).json({ error: "Supply chain escrow not found" });
  try {
    const updated = transitionSupply(s, req.body);
    store.supplyChain.set(req.params.id, updated);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Payphone Escrow Engine (Node shim) on port ${PORT}`);
});
