import { randomUUID } from "node:crypto";
import { getDb } from "./mongo.js";
import { executePaymentIntent } from "./payment-service.js";
import { circleClient, circleReady, createUsdcTransfer, circleConfig } from "./circle.js";

export async function createBond({ posterId, counterpartyId, escrowContractId, amount, posterWalletId }) {
  const db = getDb();
  const bondId = `bond-${randomUUID()}`;
  const cfg = circleConfig();
  const demo = process.env.PAYPHONE_DEMO_MODE !== "false" && process.env.PAYPHONE_DEMO_MODE !== "0";

  let fundTx = { id: `demo-bond-${bondId}`, state: "COMPLETE" };
  if (!demo && circleReady() && cfg.escrowAddress && posterWalletId) {
    const client = circleClient();
    fundTx = await createUsdcTransfer(client, {
      walletId: posterWalletId,
      destinationAddress: cfg.escrowAddress,
      amount: Number(amount).toFixed(2),
      refId: bondId,
    });
  }

  const bond = {
    bond_id: bondId,
    escrow_contract_id: escrowContractId,
    poster_id: posterId,
    counterparty_id: counterpartyId,
    amount: Number(amount),
    currency: "USDC",
    status: "Posted",
    fund_tx_id: fundTx.id,
    posted_at: Date.now(),
    locked_at: null,
    resolved_at: null,
  };
  await db.collection("bond_contracts").insertOne(bond);
  return bond;
}

export async function listBondsForUser(username) {
  return getDb()
    .collection("bond_contracts")
    .find({ $or: [{ poster_id: username }, { counterparty_id: username }] })
    .sort({ posted_at: -1 })
    .toArray();
}

export async function lockBond(bondId) {
  const db = getDb();
  const bond = await db.collection("bond_contracts").findOne({ bond_id: bondId });
  if (!bond) throw new Error("Bond not found");
  await db.collection("bond_contracts").updateOne(
    { bond_id: bondId },
    { $set: { status: "Locked", locked_at: Date.now() } }
  );
  return { ...bond, status: "Locked" };
}

export async function returnBond(bondId) {
  const db = getDb();
  const bond = await db.collection("bond_contracts").findOne({ bond_id: bondId });
  if (!bond) throw new Error("Bond not found");
  const daysHeld = bond.locked_at ? (Date.now() - bond.locked_at) / 86400000 : 0;
  const fee = daysHeld > 7 ? bond.amount * 0.01 : 0;
  await db.collection("bond_contracts").updateOne(
    { bond_id: bondId },
    { $set: { status: "Returned", resolved_at: Date.now(), fee_collected: fee } }
  );
  return { ...bond, status: "Returned", fee_collected: fee };
}

export async function forfeitBond(bondId, beneficiaryId) {
  const db = getDb();
  const bond = await db.collection("bond_contracts").findOne({ bond_id: bondId });
  if (!bond) throw new Error("Bond not found");

  await executePaymentIntent({
    type: "escrow",
    amount: bond.amount,
    sender: bond.poster_id,
    recipient: beneficiaryId,
    bondId,
    metadata: {
      chargeAmount: bond.amount,
      sellerWalletAddress: "",
      forfeit: true,
      beneficiaryId,
    },
  });

  await db.collection("bond_contracts").updateOne(
    { bond_id: bondId },
    { $set: { status: "Forfeited", resolved_at: Date.now(), forfeiture_recipient_id: beneficiaryId } }
  );
  return { ...bond, status: "Forfeited" };
}
