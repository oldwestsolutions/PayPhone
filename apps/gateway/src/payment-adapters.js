import { createAdapter } from "@payphone/payment-layer";
import { executeEscrowSettlement, executeMilestoneRelease } from "./settlement.js";
import { recordPlatformFee } from "./platform-fees.js";
import * as procurement from "./procurement.js";
import { circleClient, circleReady, createUsdcTransfer, circleConfig } from "./circle.js";
import { randomUUID } from "node:crypto";

const demoMode = () =>
  process.env.PAYPHONE_DEMO_MODE !== "false" && process.env.PAYPHONE_DEMO_MODE !== "0";

export function buildExecutionAdapters() {
  const transfer = createAdapter("CircleSettlementAdapter", {
    supports: (p) => ["transfer", "appeal"].includes(p.type),
    validate: (p) => {
      if (p.amount <= 0) return { valid: false, error: "Amount must be positive" };
      if (!p.metadata?.walletId || !p.metadata?.destinationAddress) {
        return { valid: false, error: "walletId and destinationAddress required" };
      }
      return { valid: true };
    },
    estimate: async (p) => ({ recipientAmount: p.feeConfiguration?.recipientAmount }),
    execute: async (p) => {
      const fees = p.feeConfiguration;
      const { walletId, destinationAddress } = p.metadata;
      const demo = demoMode() || !circleReady();

      if (demo) {
        const txId = `demo-${randomUUID()}`;
        if (fees.platformFee > 0) {
          recordPlatformFee({
            feeType: p.type === "appeal" ? "appeal" : "p2p_transfer",
            amount: fees.platformFee,
            fromParty: p.sender,
            circleTransferId: txId,
          });
        }
        return {
          simulated: true,
          transaction_id: txId,
          recipient_amount: fees.recipientAmount,
          platform_fee: fees.platformFee,
        };
      }

      const client = circleClient();
      const cfg = circleConfig();
      const transfers = [];

      if (fees.platformFee > 0.001 && cfg.platformFeeAddress) {
        const feeTx = await createUsdcTransfer(client, {
          walletId,
          destinationAddress: cfg.platformFeeAddress,
          amount: fees.platformFee.toFixed(2),
          refId: `${p.id}-fee`,
        });
        transfers.push(feeTx);
        recordPlatformFee({
          feeType: p.type === "appeal" ? "appeal" : "p2p_transfer",
          amount: fees.platformFee,
          fromParty: p.sender,
          circleTransferId: feeTx.id,
        });
      }

      const tx = await createUsdcTransfer(client, {
        walletId,
        destinationAddress,
        amount: fees.recipientAmount.toFixed(2),
        refId: p.id,
      });
      transfers.push(tx);

      return { simulated: false, transaction_id: tx.id, transfers, platform_fee: fees.platformFee };
    },
  });

  const escrow = createAdapter("EscrowAdapter", {
    supports: (p) => p.type === "escrow" || p.type === "bond",
    validate: (p) => {
      if (!p.contractId && !p.bondId) return { valid: false, error: "contractId or bondId required" };
      return { valid: true };
    },
    estimate: async (p) => p.feeConfiguration,
    execute: async (p) => {
      const m = p.metadata || {};
      const result = await executeEscrowSettlement({
        contractId: p.contractId || p.bondId,
        escrowAmount: p.amount,
        chargeAmount: m.chargeAmount ?? p.amount,
        tollAmount: m.tollAmount || 0,
        sellerWalletAddress: m.sellerWalletAddress || "",
        buyerWalletAddress: m.buyerWalletAddress || "",
        fromParty: p.sender,
      });
      return result;
    },
  });

  const procurementAdapter = createAdapter("ProcurementAdapter", {
    supports: (p) => p.type === "procurement",
    validate: (p) => {
      if (!p.commitmentId) return { valid: false, error: "commitmentId required" };
      return { valid: true };
    },
    estimate: async (p) => p.feeConfiguration,
    execute: async (p) => {
      const m = p.metadata || {};
      if (m.requestType === "fund") {
        const cfg = circleConfig();
        const walletId = m.walletId;
        const amount = String(m.amount || p.amount);
        const demo = demoMode() || !circleReady();
        let fund_tx = { id: `demo-proc-fund-${randomUUID()}`, state: "COMPLETE" };
        if (!demo && cfg.escrowAddress) {
          const client = circleClient();
          fund_tx = await createUsdcTransfer(client, {
            walletId,
            destinationAddress: cfg.escrowAddress,
            amount,
            refId: `procurement-${p.commitmentId}`,
          });
        }
        const commitment = procurement.transitionCommitment(p.commitmentId, {
          requestType: "fund",
          requesterId: m.requesterId || p.sender,
        });
        return { commitment, fund_tx };
      }
      if (m.requestType) {
        procurement.transitionCommitment(p.commitmentId, {
          requestType: m.requestType,
          requesterId: p.sender,
          milestoneId: m.milestoneId,
        });
      }
      if (m.milestoneId && m.recipientAddress) {
        const c = procurement.getCommitment(p.commitmentId);
        const ms = c.milestones.find((x) => x.id === m.milestoneId);
        const releaseAmount = ms?.release_amount || p.amount;
        const platformFee = p.feeConfiguration?.platformFee || 0;
        const settlement = await executeMilestoneRelease({
          commitmentId: p.commitmentId,
          releaseAmount,
          recipientAddress: m.recipientAddress,
          platformFeeAmount: platformFee,
          fromParty: p.sender,
        });
        const commitment = procurement.getCommitment(p.commitmentId);
        return { commitment, settlement };
      }
      return { ok: true };
    },
  });

  const swap = createAdapter("SwapAdapter", {
    supports: (p) => p.type === "swap",
    validate: () => ({ valid: true }),
    estimate: async (p) => ({ note: "Swap quote via Polygon Uniswap", amount: p.amount }),
    execute: async (p) => ({
      simulated: true,
      note: "Swap execution requires desktop signer — quote recorded",
      payment_id: p.id,
    }),
  });

  return new Map([
    ["CircleSettlementAdapter", transfer],
    ["EscrowAdapter", escrow],
    ["ProcurementAdapter", procurementAdapter],
    ["SwapAdapter", swap],
  ]);
}
