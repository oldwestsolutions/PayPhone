import { randomUUID } from "node:crypto";

const store = new Map();
const auditLog = [];

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
  const okParty = (id) => c.parties.some((p) => p.stellar_name === id);

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
    auditLog.push({
      commitment_id: c.commitment_id,
      event: "MILESTONE_RELEASED",
      milestone_id: ms.id,
      amount: releaseAmount,
      at: Date.now(),
    });
    if (next.milestones.every((m) => m.status === "released")) next.status = "completed";
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

export function createCommitment(body) {
  const buyerBalance = Number(body.buyerBalance ?? body.buyer_balance ?? 0);
  const totalAmount = Number(body.totalAmount ?? body.total_amount ?? 0);
  if (buyerBalance < totalAmount) {
    throw new Error("Insufficient wallet balance for commitment");
  }
  const milestones = buildMilestones(
    body.milestones || [
      { name: "Production", releasePct: 20 },
      { name: "Shipped", releasePct: 30 },
      { name: "Inspection", releasePct: 30 },
      { name: "Acceptance", releasePct: 20 },
    ]
  );
  const pctSum = milestones.reduce((s, m) => s + m.release_pct, 0);
  if (pctSum > 100.01) throw new Error("Milestone release percentages exceed 100%");

  const commitmentId = body.commitmentId || `pc-${randomUUID()}`;
  const c = {
    commitment_id: commitmentId,
    buyer_id: body.buyerId || body.buyer_id,
    supplier_id: body.supplierId || body.supplier_id,
    line_items: body.lineItems || body.line_items || [],
    total_amount: totalAmount,
    currency: body.currency || "USDC",
    milestones,
    parties: body.parties || [
      { role: "buyer", stellar_name: body.buyerId || body.buyer_id },
      { role: "supplier", stellar_name: body.supplierId || body.supplier_id },
    ],
    status: "draft",
    buyer_balance: buyerBalance,
    released_total: 0,
    created_at: Date.now(),
  };
  store.set(commitmentId, c);
  auditLog.push({ commitment_id: commitmentId, event: "COMMITMENT_CREATED", at: Date.now() });
  return c;
}

export function listCommitments(party) {
  let list = [...store.values()];
  if (party) {
    list = list.filter(
      (c) =>
        c.buyer_id === party ||
        c.supplier_id === party ||
        c.parties?.some((p) => p.stellar_name === party)
    );
  }
  return list;
}

export function getCommitment(id) {
  const c = store.get(id);
  if (!c) throw new Error("Commitment not found");
  return c;
}

export function transitionCommitment(id, body) {
  const c = store.get(id);
  if (!c) throw new Error("Commitment not found");
  const updated = transitionProcurement(c, body);
  store.set(id, updated);
  return updated;
}

export function getAudit(id) {
  const c = getCommitment(id);
  const events = auditLog.filter((e) => e.commitment_id === id);
  return { commitment: c, events };
}
