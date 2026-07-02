/**
 * Immutable append-only ledger with SHA-256 hash chain (V6 whitepaper).
 */
import { createHash, randomUUID } from "node:crypto";

export class LedgerService {
  constructor(collection) {
    this.collection = collection;
    this.lastHash = new Map();
  }

  async loadLastHashes() {
    const intents = await this.collection.distinct("intent_id", { intent_id: { $ne: null } });
    for (const intentId of intents) {
      const last = await this.collection
        .find({ intent_id: intentId })
        .sort({ recorded_at: -1 })
        .limit(1)
        .toArray();
      if (last[0]) this.lastHash.set(intentId, last[0].hash);
    }
  }

  sha256(input) {
    return createHash("sha256").update(input).digest("hex");
  }

  async record(event) {
    const intentId = event.intent_id ?? "system";
    const prevHash = this.lastHash.get(intentId) ?? "0".repeat(64);
    const recordedAt = Date.now();
    const hashInput =
      prevHash + event.event_type + JSON.stringify(event.payload || {}) + recordedAt;
    const hash = this.sha256(hashInput);

    const ledgerEvent = {
      event_id: randomUUID(),
      event_type: event.event_type,
      intent_id: event.intent_id ?? null,
      route_plan_id: event.route_plan_id ?? null,
      execution_id: event.execution_id ?? null,
      step_index: event.step_index ?? null,
      actor: event.actor || "system",
      payload: event.payload || {},
      hash,
      prev_hash: prevHash,
      recorded_at: recordedAt,
    };

    await this.collection.insertOne(ledgerEvent);
    this.lastHash.set(intentId, hash);
    return ledgerEvent;
  }

  async getChain(intentId) {
    return this.collection.find({ intent_id: intentId }).sort({ recorded_at: 1 }).toArray();
  }

  async verifyChain(intentId) {
    const events = await this.getChain(intentId);
    for (let i = 1; i < events.length; i++) {
      if (events[i].prev_hash !== events[i - 1].hash) {
        return { valid: false, chainLength: events.length, brokenAt: i };
      }
    }
    return { valid: true, chainLength: events.length };
  }

  async recent(limit = 50, filter = {}) {
    return this.collection.find(filter).sort({ recorded_at: -1 }).limit(limit).toArray();
  }
}
