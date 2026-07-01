/** @typedef {(event: { type: string, paymentId: string, payment: object, at: number, data?: object }) => void} EventEmitter */

const EVENT_MAP = {
  CREATED: "payment_created",
  ROUTING: "payment_routed",
  FUNDED: "payment_funded",
  SWAPPING: "payment_swapped",
  ESCROWED: "payment_escrowed",
  SETTLING: "payment_settled",
  COMPLETED: "payment_completed",
  FAILED: "payment_failed",
  REFUNDED: "payment_failed",
};

/**
 * @param {import('./types.js').Payment} payment
 * @param {EventEmitter|null} emit
 * @param {object} [data]
 */
export function emitPaymentEvent(payment, emit, data = {}) {
  if (!emit) return;
  const type = EVENT_MAP[payment.status] || `payment_${payment.status.toLowerCase()}`;
  emit({
    type,
    paymentId: payment.id,
    payment,
    at: Date.now(),
    data,
  });
}
