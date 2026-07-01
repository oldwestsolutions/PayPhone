import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PhoneIcon } from "../components/PhoneIcon";
import type { UserAccount } from "../types";

type Dispute = {
  dispute_id: string;
  contract_id: string;
  disputing_party: string;
  reason: string;
  status: string;
  created_at: number;
};

export function AdminPanel() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    invoke<Dispute[]>("list_admin_disputes")
      .then(setDisputes)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="panel panel-wide">
      <h1>Admin arbitration</h1>
      <p className="panel-sub">Resolve disputes · adjudicate escrow · enforce bonds · Fiverr-style claims department</p>
      {error && <p className="error">{error}</p>}

      <div className="revenue-hero">
        <PhoneIcon size={28} />
        <h2 style={{ marginTop: 12 }}>Open disputes & appeals</h2>
        <p className="hint">Users file claims; appeals cost $10 USDC via the payment layer.</p>
      </div>

      {disputes.length === 0 && <p className="empty">No open disputes.</p>}
      {disputes.map((d) => (
        <div key={d.dispute_id} className="order-card">
          <h4>{d.dispute_id}</h4>
          <p className="order-meta">Contract {d.contract_id} · @{d.disputing_party}</p>
          <p>{d.reason}</p>
          <span className="order-status active">{d.status}</span>
          <div className="escrow-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await invoke("resolve_dispute_admin", {
                    disputeId: d.dispute_id,
                    resolution: "resolve_seller",
                    winnerId: d.disputing_party,
                  });
                  setDisputes((p) => p.filter((x) => x.dispute_id !== d.dispute_id));
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Resolve for seller
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                try {
                  await invoke("resolve_dispute_admin", {
                    disputeId: d.dispute_id,
                    resolution: "resolve_buyer",
                    winnerId: d.disputing_party,
                  });
                  setDisputes((p) => p.filter((x) => x.dispute_id !== d.dispute_id));
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Resolve for buyer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BondPanel({ user }: { user: UserAccount }) {
  const [bonds, setBonds] = useState<unknown[]>([]);
  const [escrowId, setEscrowId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("50");
  const [error, setError] = useState("");

  function refresh() {
    invoke<unknown[]>("list_bonds").then(setBonds).catch(() => setBonds([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="panel panel-wide">
      <h1>Bonds</h1>
      <p className="panel-sub">Post collateral on jobs · enforced through admin arbitration if forfeited</p>

      <form
        className="send-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await invoke("create_bond", {
              escrowContractId: escrowId,
              counterpartyId: counterparty,
              amount: parseFloat(amount),
            });
            refresh();
          } catch (err) {
            setError(String(err));
          }
        }}
      >
        <input placeholder="Escrow contract ID" value={escrowId} onChange={(e) => setEscrowId(e.target.value)} required />
        <input placeholder="Counterparty @username" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} required />
        <input type="number" placeholder="Bond USDC" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <button type="submit" className="btn-primary">Post bond</button>
      </form>
      {error && <p className="error">{error}</p>}

      <ul className="escrow-list">
        {bonds.length === 0 && <li className="empty">No bonds posted</li>}
        {bonds.map((b: Record<string, unknown>) => (
          <li key={String(b.bond_id)} className="order-card" style={{ listStyle: "none" }}>
            <strong>{String(b.bond_id)}</strong>
            <p className="order-meta">
              {String(b.amount)} USDC · {String(b.status)} · escrow {String(b.escrow_contract_id)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
