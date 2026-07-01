import { PaymentOrchestrator } from "@payphone/payment-layer";
import { buildExecutionAdapters } from "./payment-adapters.js";
import { persistPayment, persistPaymentEvent, getPayment, listPaymentsForUser } from "./mongo.js";

let orchestrator = null;

export function getPaymentOrchestrator() {
  if (!orchestrator) {
    orchestrator = new PaymentOrchestrator({
      adapters: buildExecutionAdapters(),
      emit: (event) => persistPaymentEvent(event).catch(console.error),
      persist: persistPayment,
    });
  }
  return orchestrator;
}

export { getPayment, listPaymentsForUser };

/**
 * Single entry point for all financial execution.
 */
export async function executePaymentIntent(intent) {
  const orch = getPaymentOrchestrator();
  const payment = await orch.create(intent);
  const { payment: completed, result } = await orch.execute(payment, {});
  return { payment: completed, result };
}

export async function quotePaymentIntent(intent) {
  const orch = getPaymentOrchestrator();
  return orch.estimate(intent, {});
}
