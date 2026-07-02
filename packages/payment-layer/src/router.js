/**
 * Deterministic routing: pick execution adapter for a payment.
 * @param {import('./types.js').Payment} payment
 */
export function routePayment(payment) {
  const needsSwap =
    payment.sourceAsset !== payment.destinationAsset ||
    payment.sourceAsset !== "USDC";

  if (payment.type === "swap" || needsSwap) {
    return { adapter: "SwapAdapter", needsSwap: true, rail: "uniswap" };
  }
  if (payment.type === "escrow") {
    return { adapter: "EscrowAdapter", needsSwap: false, rail: "circle_escrow" };
  }
  if (payment.type === "procurement") {
    return { adapter: "ProcurementAdapter", needsSwap: false, rail: "circle_escrow" };
  }
  if (payment.type === "bond") {
    return { adapter: "EscrowAdapter", needsSwap: false, rail: "circle_bond" };
  }
  if (payment.type === "subscription") {
    return { adapter: "BtcPayAdapter", needsSwap: false, rail: "btcpay" };
  }
  if (payment.type === "appeal") {
    return { adapter: "CircleSettlementAdapter", needsSwap: false, rail: "circle" };
  }
  return { adapter: "CircleSettlementAdapter", needsSwap: false, rail: "circle" };
}
