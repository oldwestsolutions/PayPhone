import { randomUUID } from "node:crypto";
import { circleClient, circleReady, createUsdcTransfer, circleConfig } from "./circle.js";
import { calculateSettlementFees, recordPlatformFee } from "./platform-fees.js";

const demoMode = () =>
  process.env.PAYPHONE_DEMO_MODE !== "false" && process.env.PAYPHONE_DEMO_MODE !== "0";

export async function executeEscrowSettlement({
  contractId,
  escrowAmount,
  chargeAmount,
  tollAmount = 0,
  sellerWalletAddress,
  buyerWalletAddress,
  fromParty,
}) {
  const escrow = Number(escrowAmount) || 0;
  const charge = Number(chargeAmount) || 0;
  if (charge > escrow) {
    throw new Error("Call charge exceeds escrow cap");
  }

  const { sellerAmount, totalPlatform } = calculateSettlementFees(charge, tollAmount);
  const refund = Math.max(0, Math.round((escrow - charge) * 100) / 100);

  const cfg = circleConfig();
  const platformAddress = cfg.platformFeeAddress;
  const escrowWalletId = cfg.escrowWalletId;

  const transfers = [];
  const simulated = demoMode() || !circleReady() || !escrowWalletId;

  if (simulated) {
    if (sellerAmount > 0) {
      transfers.push({
        type: "seller",
        amount: sellerAmount,
        destination: sellerWalletAddress,
        transaction: { id: `demo-seller-${randomUUID()}`, state: "COMPLETE" },
      });
    }
    if (totalPlatform > 0) {
      transfers.push({
        type: "platform_fee",
        amount: totalPlatform,
        destination: platformAddress || "platform-wallet",
        transaction: { id: `demo-fee-${randomUUID()}`, state: "COMPLETE" },
      });
      recordPlatformFee({
        feeType: "settlement",
        amount: totalPlatform,
        fromParty,
        escrowContractId: contractId,
        circleTransferId: transfers[transfers.length - 1].transaction.id,
      });
    }
    if (refund > 0.001) {
      transfers.push({
        type: "refund",
        amount: refund,
        destination: buyerWalletAddress,
        transaction: { id: `demo-refund-${randomUUID()}`, state: "COMPLETE" },
      });
    }
    return {
      simulated: true,
      seller_amount: sellerAmount,
      platform_fee: totalPlatform,
      refund_amount: refund,
      transfers,
    };
  }

  if (!platformAddress) {
    throw new Error("PAYPHONE_PLATFORM_FEE_WALLET_ADDRESS is not configured");
  }

  const client = circleClient();

  if (sellerAmount > 0.001 && sellerWalletAddress) {
    const tx = await createUsdcTransfer(client, {
      walletId: escrowWalletId,
      destinationAddress: sellerWalletAddress,
      amount: sellerAmount.toFixed(2),
      refId: `settle-seller-${contractId}`,
    });
    transfers.push({ type: "seller", amount: sellerAmount, destination: sellerWalletAddress, transaction: tx });
  }

  if (totalPlatform > 0.001) {
    const tx = await createUsdcTransfer(client, {
      walletId: escrowWalletId,
      destinationAddress: platformAddress,
      amount: totalPlatform.toFixed(2),
      refId: `settle-fee-${contractId}`,
    });
    transfers.push({ type: "platform_fee", amount: totalPlatform, destination: platformAddress, transaction: tx });
    recordPlatformFee({
      feeType: "settlement",
      amount: totalPlatform,
      fromParty,
      escrowContractId: contractId,
      circleTransferId: tx.id,
    });
  }

  if (refund > 0.001 && buyerWalletAddress) {
    const tx = await createUsdcTransfer(client, {
      walletId: escrowWalletId,
      destinationAddress: buyerWalletAddress,
      amount: refund.toFixed(2),
      refId: `settle-refund-${contractId}`,
    });
    transfers.push({ type: "refund", amount: refund, destination: buyerWalletAddress, transaction: tx });
  }

  return {
    simulated: false,
    seller_amount: sellerAmount,
    platform_fee: totalPlatform,
    refund_amount: refund,
    transfers,
  };
}

export async function executeMilestoneRelease({
  commitmentId,
  escrowWalletId,
  releaseAmount,
  recipientAddress,
  platformFeeAmount,
  fromParty,
}) {
  const release = Number(releaseAmount) || 0;
  const fee = Number(platformFeeAmount) || 0;
  const cfg = circleConfig();
  const walletId = escrowWalletId || cfg.escrowWalletId;
  const simulated = demoMode() || !circleReady() || !walletId;

  if (simulated) {
    const txId = `demo-milestone-${randomUUID()}`;
    if (fee > 0) {
      recordPlatformFee({
        feeType: "procurement_milestone",
        amount: fee,
        fromParty,
        commitmentId,
        circleTransferId: txId,
      });
    }
    return {
      simulated: true,
      recipient_amount: release - fee,
      platform_fee: fee,
      transaction: { id: txId, state: "COMPLETE" },
    };
  }

  const client = circleClient();
  const recipientAmt = Math.max(0, release - fee);
  let tx = null;
  if (recipientAmt > 0.001 && recipientAddress) {
    tx = await createUsdcTransfer(client, {
      walletId,
      destinationAddress: recipientAddress,
      amount: recipientAmt.toFixed(2),
      refId: `procurement-${commitmentId}`,
    });
  }
  if (fee > 0.001 && cfg.platformFeeAddress) {
    const feeTx = await createUsdcTransfer(client, {
      walletId,
      destinationAddress: cfg.platformFeeAddress,
      amount: fee.toFixed(2),
      refId: `procurement-fee-${commitmentId}`,
    });
    recordPlatformFee({
      feeType: "procurement_milestone",
      amount: fee,
      fromParty,
      commitmentId,
      circleTransferId: feeTx.id,
    });
  }
  return { simulated: false, recipient_amount: release - fee, platform_fee: fee, transaction: tx };
}
