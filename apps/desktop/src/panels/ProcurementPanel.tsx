import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProgrammableCommitment } from "../types";

const STATUS_PROGRESS: Record<string, number> = {
  draft: 10,
  funded: 25,
  active: 50,
  completed: 100,
  disputed: 40,
  cancelled: 0,
};

export function ProcurementPanel() {
  const [commitments, setCommitments] = useState<ProgrammableCommitment[]>([]);
  const [supplier, setSupplier] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("1000");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"list" | "create">("list");

  function refresh() {
    invoke<ProgrammableCommitment[]>("list_procurement_commitments")
      .then(setCommitments)
      .catch(() => setCommitments([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await invoke("create_procurement_commitment", {
        supplierId: supplier,
        totalAmount: parseFloat(amount),
        sku,
        quantity: parseInt(quantity, 10),
      });
      setTab("list");
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="panel panel-wide">
      <h1>Procurement</h1>
      <p className="panel-sub">Programmable commitments · milestone payments · supply chain</p>

      <div className="section-tabs">
        <button type="button" className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          My commitments
        </button>
        <button type="button" className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}>
          New PO
        </button>
      </div>

      {tab === "create" && (
        <form className="send-form" onSubmit={handleCreate}>
          <input placeholder="Supplier @username" value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
          <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
          <input placeholder="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <input placeholder="Total USDC" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <p className="hint">Default milestones: 20% production · 30% ship · 30% inspect · 20% accept</p>
          <button type="submit" className="btn-primary">Create commitment</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {tab === "list" && (
        <>
          {commitments.length === 0 && <p className="empty">No procurement commitments yet.</p>}
          {commitments.map((c) => (
            <div key={c.commitment_id} className="order-card">
              <h4>{c.commitment_id}</h4>
              <p className="order-meta">
                {c.buyer_id} → {c.supplier_id} · ${c.total_amount} {c.currency}
              </p>
              <div className="order-progress">
                <div
                  className="order-progress-fill"
                  style={{ width: `${STATUS_PROGRESS[c.status] ?? 20}%` }}
                />
              </div>
              <span className={`order-status ${c.status === "completed" ? "settled" : c.status === "active" ? "active" : "draft"}`}>
                {c.status}
              </span>

              <div className="milestone-track">
                {c.milestones.map((m) => (
                  <div key={m.id} className={`milestone-step ${m.status === "released" ? "done" : ""}`}>
                    <div>
                      <strong>{m.name}</strong>
                      <span>{m.release_pct}% · {m.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="escrow-actions">
                {c.status === "draft" && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        await invoke("fund_procurement_commitment", { commitmentId: c.commitment_id });
                        refresh();
                      } catch (err) {
                        setError(String(err));
                      }
                    }}
                  >
                    Fund escrow
                  </button>
                )}
                {c.status === "funded" && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        await invoke("transition_procurement_commitment", {
                          commitmentId: c.commitment_id,
                          requestType: "accept",
                        });
                        refresh();
                      } catch (err) {
                        setError(String(err));
                      }
                    }}
                  >
                    Accept (supplier)
                  </button>
                )}
                {c.status === "active" &&
                  c.milestones
                    .filter((m) => m.status === "pending")
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="btn-ghost"
                        onClick={async () => {
                          try {
                            await invoke("transition_procurement_commitment", {
                              commitmentId: c.commitment_id,
                              requestType: "release_milestone",
                              milestoneId: m.id,
                            });
                            refresh();
                          } catch (err) {
                            setError(String(err));
                          }
                        }}
                      >
                        Release {m.name}
                      </button>
                    ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
