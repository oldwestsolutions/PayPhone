import { executePaymentIntent } from "./payment-service.js";
import { circleConfig } from "./circle.js";
import * as procurement from "./procurement.js";

/**
 * Thin wrappers — legacy API shapes delegate to the payment layer.
 */

export async function legacyP2pTransfer(body) {
  const walletId = String(body?.walletId || "").trim();
  const destinationAddress = String(body?.destinationAddress || "").trim();
  const amount = Number(body?.amount || 0);
  const fromParty = String(body?.fromParty || "").trim() || "unknown";
  const collectPlatformFee = body?.collectPlatformFee !== false;

  if (!walletId || !destinationAddress || !amount) {
    throw new Error("walletId, destinationAddress, and amount are required");
  }

  const { payment, result } = await executePaymentIntent({
    type: "transfer",
    amount,
    sender: fromParty,
    recipient: destinationAddress,
    metadata: {
      walletId,
      destinationAddress,
      refId: body?.refId,
      skipPlatformFee: !collectPlatformFee,
    },
  });

  return {
    payment_id: payment.id,
    transaction: { id: result.transaction_id, state: "COMPLETE" },
    amount_sent: amount,
    recipient_amount: result.recipient_amount ?? payment.feeConfiguration?.recipientAmount,
    platform_fee: result.platform_fee ?? payment.feeConfiguration?.platformFee ?? 0,
    simulated: Boolean(result.simulated),
    transfers: result.transfers,
  };
}

export async function legacyEscrowSettle(body) {
  const contractId = String(body?.contractId || "").trim();
  const escrowAmount = Number(body?.escrowAmount || 0);
  if (!contractId || !escrowAmount) {
    throw new Error("contractId and escrowAmount are required");
  }

  const { payment, result } = await executePaymentIntent({
    type: "escrow",
    amount: escrowAmount,
    contractId,
    sender: String(body?.fromParty || "").trim() || "unknown",
    recipient: String(body?.sellerWalletAddress || "").trim(),
    metadata: {
      chargeAmount: Number(body?.chargeAmount ?? body?.escrowAmount ?? 0),
      tollAmount: Number(body?.tollAmount || 0),
      sellerWalletAddress: String(body?.sellerWalletAddress || "").trim(),
      buyerWalletAddress: String(body?.buyerWalletAddress || "").trim(),
    },
  });

  return { payment_id: payment.id, ...result };
}

export async function legacyEscrowFund(body) {
  const cfg = circleConfig();
  const walletId = String(body?.walletId || "").trim();
  const amount = Number(body?.amount || 0);
  const contractId = String(body?.contractId || "").trim();

  if (!walletId || !amount || !contractId) {
    throw new Error("walletId, amount, and contractId are required");
  }
  if (!cfg.escrowAddress) {
    throw new Error("PAYPHONE_ESCROW_WALLET_ADDRESS is not configured in .env");
  }

  const { payment, result } = await executePaymentIntent({
    type: "transfer",
    amount,
    sender: String(body?.fromParty || "").trim() || "unknown",
    recipient: cfg.escrowAddress,
    metadata: {
      walletId,
      destinationAddress: cfg.escrowAddress,
      refId: `escrow-${contractId}`,
      skipPlatformFee: true,
      escrowContractId: contractId,
    },
  });

  return {
    payment_id: payment.id,
    transaction: { id: result.transaction_id, state: "COMPLETE" },
    escrow_address: cfg.escrowAddress,
    simulated: Boolean(result.simulated),
  };
}

export async function legacyProcurementFund(commitmentId, body) {
  const walletId = String(body?.walletId || "").trim();
  const requesterId = String(body?.requesterId || "").trim();
  if (!walletId) throw new Error("walletId is required");

  const commitment = procurement.getCommitment(commitmentId);
  const amount = Number(body?.amount || commitment.total_amount || 0);
  if (!amount) throw new Error("amount is required");

  const { payment, result } = await executePaymentIntent({
    type: "procurement",
    amount,
    commitmentId,
    sender: requesterId || commitment.buyer_id || "unknown",
    recipient: "escrow",
    metadata: {
      walletId,
      requestType: "fund",
      requesterId: requesterId || commitment.buyer_id,
      amount,
    },
  });

  return {
    payment_id: payment.id,
    commitment: result.commitment,
    fund_tx: result.fund_tx,
  };
}

export async function legacyProcurementRelease(commitmentId, body) {
  const milestoneId = String(body?.milestoneId || "").trim();
  const recipientAddress = String(body?.recipientAddress || "").trim();
  const fromParty = String(body?.fromParty || "").trim();

  const commitment = procurement.getCommitment(commitmentId);
  const milestone = commitment.milestones?.find((m) => m.id === milestoneId);
  const releaseAmount = milestone?.release_amount || 0;

  const { payment, result } = await executePaymentIntent({
    type: "procurement",
    amount: releaseAmount,
    commitmentId,
    sender: fromParty || String(body?.requesterId || "").trim() || "unknown",
    recipient: recipientAddress,
    metadata: {
      requestType: "release_milestone",
      requesterId: body?.requesterId,
      milestoneId,
      recipientAddress,
    },
  });

  return {
    payment_id: payment.id,
    commitment: result.commitment,
    settlement: result.settlement ?? result,
  };
}

export async function legacyPurchaseCredits(body) {
  const walletId = String(body?.walletId || "").trim();
  const usdcAmount = Number(body?.usdcAmount || 0);
  const username = String(body?.username || "").trim();
  const cfg = circleConfig();

  if (!walletId || !usdcAmount || usdcAmount <= 0) {
    throw new Error("walletId and positive usdcAmount are required");
  }
  if (!cfg.escrowAddress) {
    throw new Error("PAYPHONE_ESCROW_WALLET_ADDRESS is not configured");
  }

  const { payment, result } = await executePaymentIntent({
    type: "transfer",
    amount: usdcAmount,
    sender: username || walletId,
    recipient: cfg.escrowAddress,
    metadata: {
      walletId,
      destinationAddress: cfg.escrowAddress,
      refId: `credits-${username || walletId}`,
      skipPlatformFee: true,
    },
  });

  return {
    payment_id: payment.id,
    txRef: result.transaction_id,
    usdcPaid: usdcAmount,
    storageGibMonths: usdcAmount,
    commsUnits: usdcAmount * 1000,
    solidityContract: "PayPhoneCredits",
    quote: { filecoinRatePerGibMonth: 0.5, transferRatePerMib: 0.02 },
    simulated: Boolean(result.simulated),
  };
}
