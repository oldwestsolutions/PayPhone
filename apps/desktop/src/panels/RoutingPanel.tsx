import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ExecutionStatus, LedgerEvent } from "../types";

export function RoutingPanel() {
  const [executionId, setExecutionId] = useState("");
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [intentId, setIntentId] = useState("");
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!executionId || status?.status === "completed" || status?.status === "failed") return;
    const id = setInterval(async () => {
      try {
        const s = await invoke<ExecutionStatus>("get_execution_status", { executionId });
        setStatus(s);
      } catch {
        /* polling */
      }
    }, 2000);
    return () => clearInterval(id);
  }, [executionId, status?.status]);

  async function loadExecution() {
    setError("");
    try {
      const s = await invoke<ExecutionStatus>("get_execution_status", { executionId });
      setStatus(s);
    } catch (e) {
      setError(String(e));
    }
  }

  async function loadLedger() {
    setError("");
    try {
      const chain = await invoke<LedgerEvent[]>("get_ledger_chain", { intentId });
      setLedger(chain);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="panel panel-wide">
      <h1>Routes & ledger</h1>
      <p className="panel-sub">Track execution steps and verify immutable event chains</p>

      <form
        className="send-form"
        onSubmit={(e) => {
          e.preventDefault();
          loadExecution();
        }}
      >
        <input
          placeholder="Execution ID (exec-...)"
          value={executionId}
          onChange={(e) => setExecutionId(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Load execution
        </button>
      </form>

      {status && (
        <div className="order-card">
          <h4>{status.execution_id}</h4>
          <p className="order-meta">
            {status.status} · intent {status.intent_id}
          </p>
          <ul>
            {status.steps?.map((step, i) => (
              <li key={i}>
                Step {step.step_index}: {step.status}
                {step.error && ` — ${step.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="send-form"
        style={{ marginTop: 24 }}
        onSubmit={(e) => {
          e.preventDefault();
          loadLedger();
        }}
      >
        <input
          placeholder="Intent ID for ledger chain"
          value={intentId}
          onChange={(e) => setIntentId(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Load ledger
        </button>
      </form>

      {ledger.length > 0 && (
        <ul className="escrow-list">
          {ledger.map((ev) => (
            <li key={ev.event_id} className="order-card" style={{ listStyle: "none" }}>
              <strong>{ev.event_type}</strong>
              <p className="order-meta">
                {new Date(ev.recorded_at).toLocaleString()} · {ev.actor}
              </p>
              <p className="hint" style={{ fontFamily: "monospace", fontSize: 11 }}>
                {ev.hash?.slice(0, 16)}…
              </p>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
