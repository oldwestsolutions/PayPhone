import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UserAccount, CanonicalIntent, RoutePlan, ExecutionStatus } from "../types";

const ASSETS = ["BTC", "ETH", "MATIC", "USDC", "XLM", "WETH", "WBTC", "DAI"];
const PURPOSES = [
  { id: "fund_wallet", label: "Fund wallet" },
  { id: "peer_payment", label: "Pay someone" },
  { id: "fund_escrow", label: "Fund escrow" },
  { id: "general_swap", label: "General swap" },
];

export function SwapPanel({ user }: { user: UserAccount }) {
  const [assetIn, setAssetIn] = useState("MATIC");
  const [assetOut, setAssetOut] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [urgency, setUrgency] = useState("Balanced");
  const [purpose, setPurpose] = useState("fund_wallet");
  const [recipient, setRecipient] = useState("");
  const [intent, setIntent] = useState<CanonicalIntent | null>(null);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validSec, setValidSec] = useState(0);

  useEffect(() => {
    if (!route?.valid_until_unix) return;
    const tick = () => {
      const left = Math.max(0, route.valid_until_unix - Math.floor(Date.now() / 1000));
      setValidSec(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [route]);

  async function getRoute() {
    setLoading(true);
    setError("");
    setRoute(null);
    setExecution(null);
    try {
      const canonical = await invoke<CanonicalIntent>("submit_intent", {
        assetIn,
        amountIn: amount,
        assetOut,
        recipient: recipient || null,
        purpose,
        urgency,
      });
      setIntent(canonical);
      const plan = await invoke<RoutePlan>("get_route", { intentId: canonical.intentId });
      setRoute(plan);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!route) return;
    setLoading(true);
    setError("");
    try {
      const exec = await invoke<ExecutionStatus>("confirm_execution", {
        routePlanId: route.route_plan_id,
      });
      setExecution(exec);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel-wide swap-panel">
      <h1>Cross-asset swap</h1>
      <p className="panel-sub">
        Non-custodial orchestration — @{user.username} · Intent → Route → Execute · 0.5% service fee,
        network fees at cost
      </p>

      <div className="swap-grid">
        <label>
          From
          <select value={assetIn} onChange={(e) => setAssetIn(e.target.value)}>
            {ASSETS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={assetOut} onChange={(e) => setAssetOut(e.target.value)}>
            {ASSETS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="swap-amount">
          Amount
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50"
          />
        </label>
        <label>
          Purpose
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {PURPOSES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {(purpose === "peer_payment" || purpose === "fund_escrow") && (
          <label className="swap-full">
            Recipient / contract
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="@alice or ctr_..." />
          </label>
        )}
        <div className="urgency-tabs swap-full">
          {(["Fast", "Balanced", "Cheap"] as const).map((u) => (
            <button
              key={u}
              type="button"
              className={urgency === u ? "active" : ""}
              onClick={() => setUrgency(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="button" className="btn-primary" disabled={loading || !amount} onClick={getRoute}>
        {loading ? "Finding best route…" : "Get route"}
      </button>

      {route && (
        <div className="route-preview">
          <h3>Route preview</h3>
          <p className="hint">{route.selected_reason}</p>
          <ul className="route-steps">
            {route.steps.map((step) => (
              <li key={step.step_index}>
                <strong>{step.provider}</strong> · {step.asset_in} → {step.asset_out} · fee{" "}
                {step.estimated_fee_usdc} USDC · ~{Math.round(step.estimated_latency_ms / 1000)}s
              </li>
            ))}
          </ul>
          <div className="fee-breakdown">
            <p>
              You receive (est.): <strong>{route.estimated_output_amount} {route.estimated_output_asset}</strong>
            </p>
            <p>Service fee (0.5%): {route.service_fee_usdc} USDC</p>
            <p>Network fees: {route.network_fee_usdc} USDC</p>
            <p className="hint">{route.fee_note}</p>
            <p className={validSec < 5 ? "error" : "hint"}>Quote valid: {validSec}s</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={loading || validSec === 0}
            onClick={confirm}
          >
            Confirm execution
          </button>
        </div>
      )}

      {execution && (
        <div className="execution-status">
          <h3>Execution {execution.execution_id}</h3>
          <p>Status: {execution.status}</p>
        </div>
      )}

      {intent && (
        <p className="hint" style={{ marginTop: 12 }}>
          Intent {intent.intentId} · {intent.assetIn} {intent.amountIn} → {intent.assetOut}
        </p>
      )}
    </div>
  );
}
