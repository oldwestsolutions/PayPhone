import { createPayment } from "./types.js";
import { calculateFees } from "./fees.js";
import { transitionPayment, canTransition } from "./state-machine.js";
import { emitPaymentEvent } from "./events.js";
import { routePayment } from "./router.js";

/**
 * Payment Layer orchestrator — sole entry point for financial execution.
 * Does NOT move funds directly; delegates to execution adapters in ctx.
 */
export class PaymentOrchestrator {
  /**
   * @param {object} options
   * @param {Map<string, import('./adapters/base.js').ExecutionAdapter>} options.adapters
   * @param {import('./events.js').EventEmitter} [options.emit]
   * @param {(payment: object) => Promise<void>} [options.persist]
   */
  constructor({ adapters, emit, persist }) {
    this.adapters = adapters;
    this.emit = emit || null;
    this.persist = persist || (async () => {});
  }

  /**
   * @param {Partial<import('./types.js').Payment>} intent
   */
  async create(intent) {
    let payment = createPayment(intent);
    payment = transitionPayment(payment, "ROUTING");
    emitPaymentEvent(payment, this.emit);

    const route = routePayment(payment);
    payment.adapter = route.adapter;
    payment.metadata = { ...payment.metadata, route };
    payment = transitionPayment(payment, "QUOTED");
    payment.feeConfiguration = calculateFees(payment);
    emitPaymentEvent(payment, this.emit, { route, fees: payment.feeConfiguration });

    await this.persist(payment);
    return payment;
  }

  /**
   * @param {import('./types.js').Payment} payment
   * @param {object} ctx - execution context (circle client, mongo, etc.)
   */
  async execute(payment, ctx = {}) {
    if (!payment.feeConfiguration) {
      payment.feeConfiguration = calculateFees(payment);
    }

    const adapter = this.adapters.get(payment.adapter);
    if (!adapter) {
      payment = transitionPayment(payment, "FAILED");
      payment.metadata = { ...payment.metadata, error: `No adapter: ${payment.adapter}` };
      await this.persist(payment);
      emitPaymentEvent(payment, this.emit);
      throw new Error(payment.metadata.error);
    }

    const validation = await adapter.validate(payment);
    if (!validation.valid) {
      payment = transitionPayment(payment, "FAILED");
      payment.metadata = { ...payment.metadata, error: validation.error };
      await this.persist(payment);
      emitPaymentEvent(payment, this.emit);
      throw new Error(validation.error || "Validation failed");
    }

    if (canTransition(payment.status, "FUNDED")) {
      payment = transitionPayment(payment, "FUNDED");
      emitPaymentEvent(payment, this.emit);
    }
    payment = transitionPayment(payment, "PROCESSING");
    emitPaymentEvent(payment, this.emit);

    if (route?.needsSwap) {
      payment = transitionPayment(payment, "SWAPPING");
      emitPaymentEvent(payment, this.emit);
      const swapAdapter = this.adapters.get("SwapAdapter");
      if (swapAdapter) {
        await swapAdapter.execute(payment, ctx);
      }
      payment = transitionPayment(payment, "PROCESSING");
      emitPaymentEvent(payment, this.emit);
    }

    if (["escrow", "procurement", "bond"].includes(payment.type)) {
      if (canTransition(payment.status, "ESCROWED")) {
        payment = transitionPayment(payment, "ESCROWED");
        emitPaymentEvent(payment, this.emit);
      }
    }

    payment = transitionPayment(payment, "SETTLING");
    emitPaymentEvent(payment, this.emit);

    const result = await adapter.execute(payment, ctx);

    payment = transitionPayment(payment, "COMPLETED");
    payment.metadata = { ...payment.metadata, executionResult: result };
    emitPaymentEvent(payment, this.emit, result);
    await this.persist(payment);

    return { payment, result };
  }

  async estimate(partial, ctx = {}) {
    const payment = createPayment(partial);
    payment.feeConfiguration = calculateFees(payment);
    const route = routePayment(payment);
    const adapter = this.adapters.get(route.adapter);
    if (!adapter) {
      return { payment, fees: payment.feeConfiguration, route, estimate: null };
    }
    const estimate = await adapter.estimate(payment, ctx);
    return { payment, fees: payment.feeConfiguration, route, estimate };
  }
}
