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
  procurement: new Map(),
  auditLog: [],
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

function buildMilestones(milestones = []) {
  return milestones.map((m, i) => ({
    id: m.id || `ms-${i + 1}`,
    name: m.name || `Milestone ${i + 1}`,
    release_pct: Number(m.releasePct ?? m.release_pct ?? 0),
    release_amount: 0,
    condition: m.condition || "manual",
    status: "pending",
    completed_at: null,
  }));
}

function transitionProcurement(c, req) {
  const { requestType, requesterId, milestoneId } = req;
  const next = { ...c, milestones: c.milestones.map((m) => ({ ...m })) };
  const okParty = (id) =>
    c.parties.some((p) => p.stellar_name === id || p.stellarName === id);

  if (requestType === "fund" && c.status === "draft") {
    if (requesterId !== c.buyer_id) throw new Error("Only buyer can fund");
    next.status = "funded";
    next.funded_at = Date.now();
    return next;
  }
  if (requestType === "accept" && c.status === "funded") {
    if (requesterId !== c.supplier_id) throw new Error("Only supplier can accept");
    next.status = "active";
    next.activated_at = Date.now();
    return next;
  }
  if (requestType === "release_milestone" && c.status === "active") {
    if (!okParty(requesterId)) throw new Error("Only parties can release milestones");
    const ms = next.milestones.find((m) => m.id === milestoneId);
    if (!ms) throw new Error("Milestone not found");
    if (ms.status === "released") throw new Error("Milestone already released");
    const releaseAmount = Math.round(c.total_amount * (ms.release_pct / 100) * 100) / 100;
    ms.release_amount = releaseAmount;
    ms.status = "released";
    ms.completed_at = Date.now();
    next.released_total = (next.released_total || 0) + releaseAmount;
    store.auditLog.push({
      commitment_id: c.commitment_id,
      event: "MILESTONE_RELEASED",
      milestone_id: ms.id,
      amount: releaseAmount,
      at: Date.now(),
    });
    const allReleased = next.milestones.every((m) => m.status === "released");
    if (allReleased) next.status = "completed";
    return next;
  }
  if (requestType === "dispute" && c.status === "active") {
    if (!okParty(requesterId)) throw new Error("Only parties can dispute");
    next.status = "disputed";
    return next;
  }
  if (requestType === "cancel" && (c.status === "draft" || c.status === "funded")) {
    next.status = "cancelled";
    return next;
  }
  throw new Error(`Invalid transition '${requestType}' from ${c.status}`);
}

app.post("/procurement", (req, res) => {
  const p = req.body || {};
  const buyerBalance = Number(p.buyerBalance ?? p.buyer_balance ?? 0);
  const totalAmount = Number(p.totalAmount ?? p.total_amount ?? 0);
  if (buyerBalance < totalAmount) {
    return res.status(400).json({ error: "Insufficient wallet balance for commitment" });
  }
  const milestones = buildMilestones(p.milestones || [
    { name: "Production", releasePct: 20 },
    { name: "Shipped", releasePct: 30 },
    { name: "Inspection", releasePct: 30 },
    { name: "Acceptance", releasePct: 20 },
  ]);
  const pctSum = milestones.reduce((s, m) => s + m.release_pct, 0);
  if (pctSum > 100.01) {
    return res.status(400).json({ error: "Milestone release percentages exceed 100%" });
  }
  const commitmentId = p.commitmentId || `pc-${Date.now()}`;
  const c = {
    commitment_id: commitmentId,
    buyer_id: p.buyerId || p.buyer_id,
    supplier_id: p.supplierId || p.supplier_id,
    line_items: p.lineItems || p.line_items || [],
    total_amount: totalAmount,
    currency: p.currency || "USDC",
    milestones,
    parties: p.parties || [
      { role: "buyer", stellar_name: p.buyerId || p.buyer_id },
      { role: "supplier", stellar_name: p.supplierId || p.supplier_id },
    ],
    status: "draft",
    buyer_balance: buyerBalance,
    released_total: 0,
    created_at: Date.now(),
  };
  store.procurement.set(commitmentId, c);
  store.auditLog.push({ commitment_id: commitmentId, event: "COMMITMENT_CREATED", at: Date.now() });
  res.status(201).json(c);
});

app.get("/procurement", (req, res) => {
  const party = String(req.query.party || "").trim();
  let list = [...store.procurement.values()];
  if (party) {
    list = list.filter(
      (c) => c.buyer_id === party || c.supplier_id === party ||
        c.parties?.some((p) => p.stellar_name === party)
    );
  }
  res.json(list);
});

app.get("/procurement/:id", (req, res) => {
  const c = store.procurement.get(req.params.id);
  if (!c) return res.status(404).json({ error: "Commitment not found" });
  res.json(c);
});

app.post("/procurement/:id/transition", (req, res) => {
  const c = store.procurement.get(req.params.id);
  if (!c) return res.status(400).json({ error: "Commitment not found" });
  try {
    const updated = transitionProcurement(c, req.body);
    store.procurement.set(req.params.id, updated);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/procurement/:id/audit", (req, res) => {
  const c = store.procurement.get(req.params.id);
  if (!c) return res.status(404).json({ error: "Commitment not found" });
  const events = store.auditLog.filter((e) => e.commitment_id === req.params.id);
  res.json({ commitment: c, events });
});

app.listen(PORT, () => {
  console.log(`Payphone Escrow Engine (Node shim) on port ${PORT}`);
});
