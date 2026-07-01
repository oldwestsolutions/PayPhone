/** @typedef {'transfer'|'escrow'|'procurement'|'swap'|'invoice'|'subscription'|'bond'|'appeal'} PaymentType */

/** @typedef {'CREATED'|'ROUTING'|'QUOTED'|'FUNDED'|'PROCESSING'|'SWAPPING'|'ESCROWED'|'SETTLING'|'COMPLETED'|'FAILED'|'REFUNDED'} PaymentStatus */

/**
 * @typedef {Object} FeeBreakdown
 * @property {number} platformFee
 * @property {number} tollCommission
 * @property {number} swapFee
 * @property {number} totalFees
 * @property {number} recipientAmount
 * @property {string} feeCollectionTiming - 'pre_execution' | 'settlement'
 */

/**
 * @typedef {Object} Payment
 * @property {string} id
 * @property {PaymentType} type
 * @property {string} sourceAsset
 * @property {string} destinationAsset
 * @property {string} sourceNetwork
 * @property {string} destinationNetwork
 * @property {number} amount
 * @property {string} sender
 * @property {string} recipient
 * @property {Object} [optionalConditions]
 * @property {Object} [escrowRules]
 * @property {Object} [routingPreferences]
 * @property {FeeBreakdown} [feeConfiguration]
 * @property {PaymentStatus} status
 * @property {string} [adapter]
 * @property {string} [contractId]
 * @property {string} [commitmentId]
 * @property {string} [bondId]
 * @property {Object} [metadata]
 * @property {number} createdAt
 * @property {number} updatedAt
 */

export const PAYMENT_STATUSES = [
  "CREATED",
  "ROUTING",
  "QUOTED",
  "FUNDED",
  "PROCESSING",
  "SWAPPING",
  "ESCROWED",
  "SETTLING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
];

export function createPayment(partial = {}) {
  const now = Date.now();
  return {
    id: partial.id || `pay-${now}-${Math.random().toString(36).slice(2, 9)}`,
    type: partial.type || "transfer",
    sourceAsset: partial.sourceAsset || "USDC",
    destinationAsset: partial.destinationAsset || "USDC",
    sourceNetwork: partial.sourceNetwork || "polygon",
    destinationNetwork: partial.destinationNetwork || "polygon",
    amount: Number(partial.amount) || 0,
    sender: partial.sender || "",
    recipient: partial.recipient || "",
    optionalConditions: partial.optionalConditions || null,
    escrowRules: partial.escrowRules || null,
    routingPreferences: partial.routingPreferences || {},
    feeConfiguration: partial.feeConfiguration || null,
    status: "CREATED",
    adapter: null,
    contractId: partial.contractId || null,
    commitmentId: partial.commitmentId || null,
    bondId: partial.bondId || null,
    metadata: partial.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
}
