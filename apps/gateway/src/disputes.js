import { randomUUID } from "node:crypto";
import { getDb } from "./mongo.js";
import { executePaymentIntent } from "./payment-service.js";
import { FEE_RATES } from "@payphone/payment-layer";

export async function createDispute({ contractId, disputingParty, reason, contractType = "escrow" }) {
  const db = getDb();
  const disputeId = `disp-${randomUUID()}`;
  const dispute = {
    dispute_id: disputeId,
    contract_id: contractId,
    contract_type: contractType,
    disputing_party: disputingParty,
    reason,
    status: "open",
    resolution: null,
    winner_id: null,
    admin_notes: [],
    created_at: Date.now(),
    resolved_at: null,
  };
  await db.collection("disputes").insertOne(dispute);
  return dispute;
}

export async function addClaim({ disputeId, claimantId, body, evidenceTokens = [] }) {
  const db = getDb();
  const claimId = `claim-${randomUUID()}`;
  const claim = {
    claim_id: claimId,
    dispute_id: disputeId,
    claimant_id: claimantId,
    body,
    evidence_tokens: evidenceTokens,
    created_at: Date.now(),
  };
  await db.collection("claims").insertOne(claim);
  await db.collection("disputes").updateOne(
    { dispute_id: disputeId },
    { $push: { admin_notes: { type: "claim", claim_id: claimId, at: Date.now() } } }
  );
  return claim;
}

export async function fileAppeal({ disputeId, appellantId, walletId, destinationAddress }) {
  const appealFee = FEE_RATES.appeal;
  const { payment, result } = await executePaymentIntent({
    type: "appeal",
    amount: appealFee,
    sender: appellantId,
    recipient: "platform",
    metadata: { walletId, destinationAddress: destinationAddress || "platform", disputeId },
  });

  const db = getDb();
  await db.collection("disputes").updateOne(
    { dispute_id: disputeId },
    {
      $set: { status: "appeal_pending", updated_at: Date.now() },
      $push: {
        admin_notes: {
          type: "appeal",
          appellant_id: appellantId,
          payment_id: payment.id,
          fee: appealFee,
          at: Date.now(),
        },
      },
    }
  );
  return { dispute_id: disputeId, appeal_fee: appealFee, payment, result };
}

export async function resolveDispute({ disputeId, resolution, winnerId, adminId, splitPct = null }) {
  const db = getDb();
  const dispute = await db.collection("disputes").findOne({ dispute_id: disputeId });
  if (!dispute) throw new Error("Dispute not found");

  const outcome = {
    dispute_id: disputeId,
    resolution,
    winner_id: winnerId,
    split_pct: splitPct,
    resolved_by: adminId,
    resolved_at: Date.now(),
  };

  await db.collection("disputes").updateOne(
    { dispute_id: disputeId },
    { $set: { status: "resolved", resolution, winner_id: winnerId, resolved_at: Date.now() } }
  );

  await db.collection("escrow_outcomes").insertOne({
    outcome_id: `out-${randomUUID()}`,
    dispute_id: disputeId,
    contract_id: dispute.contract_id,
    ...outcome,
  });

  return outcome;
}

export async function listOpenDisputes() {
  return getDb().collection("disputes").find({ status: { $in: ["open", "appeal_pending"] } }).toArray();
}

export async function listDisputesForUser(username) {
  return getDb()
    .collection("disputes")
    .find({ $or: [{ disputing_party: username }] })
    .sort({ created_at: -1 })
    .toArray();
}
