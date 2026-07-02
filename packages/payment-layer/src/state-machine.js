const TRANSITIONS = {
  CREATED: ["ROUTING", "FAILED"],
  ROUTING: ["QUOTED", "FAILED"],
  QUOTED: ["FUNDED", "FAILED"],
  FUNDED: ["PROCESSING", "FAILED"],
  PROCESSING: ["SWAPPING", "ESCROWED", "SETTLING", "FAILED"],
  SWAPPING: ["PROCESSING", "FAILED"],
  ESCROWED: ["SETTLING", "FAILED", "REFUNDED"],
  SETTLING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["REFUNDED"],
  REFUNDED: [],
};

/**
 * @param {import('./types.js').Payment} payment
 * @param {import('./types.js').PaymentStatus} nextStatus
 */
export function transitionPayment(payment, nextStatus) {
  const allowed = TRANSITIONS[payment.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid payment transition ${payment.status} → ${nextStatus}`);
  }
  return { ...payment, status: nextStatus, updatedAt: Date.now() };
}

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}
