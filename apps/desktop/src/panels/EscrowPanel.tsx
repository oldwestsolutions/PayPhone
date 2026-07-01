import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EscrowContract } from "../types";

const TRANSITIONS = ["fund", "activate", "request_release", "settle", "dispute", "cancel"];

export function EscrowPanel() {
  const [escrows, setEscrows] = useState<EscrowContract[]>([]);
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState("");

  function refresh() {
    invoke<EscrowContract[]>("list_escrows").then(setEscrows).catch(() => setEscrows([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await invoke("create_escrow", {
        sellerId: seller,
        amount: parseFloat(amount),
        currency: "XLM",
      });
      setSeller("");
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleTransition(contractId: string, requestType: string) {
    setError("");
    try {
      await invoke("transition_escrow", { contractId, requestType });
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="panel">
      <h1>Escrow contracts</h1>
      <p className="panel-sub">Validated by the Haskell rules engine</p>
      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Seller username" value={seller} onChange={(e) => setSeller(e.target.value)} required />
        <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <button type="submit" className="btn-secondary">New escrow</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="escrow-list">
        {escrows.length === 0 && <li className="empty">No escrows yet</li>}
        {escrows.map((e) => (
          <li key={e.contractId} className="escrow-item">
            <div>
              <strong>{e.contractId}</strong>
              <span>{e.buyerId} → {e.sellerId} · {e.amount} {e.currency}</span>
              <span className="escrow-status">{e.status}</span>
            </div>
            <div className="escrow-actions">
              {TRANSITIONS.map((t) => (
                <button key={t} type="button" className="btn-ghost" onClick={() => handleTransition(e.contractId, t)}>
                  {t}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
