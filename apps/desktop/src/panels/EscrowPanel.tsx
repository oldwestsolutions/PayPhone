import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EscrowContract, MarketingEscrow, SupplyChainEscrow } from "../types";

const TRANSITIONS = ["fund", "activate", "settle_call", "request_release", "settle", "dispute", "cancel"];
const MKT_TRANSITIONS = ["fund", "activate", "request_release", "settle", "dispute", "cancel"];
const SUP_TRANSITIONS = ["fund", "activate", "request_release", "settle", "dispute", "cancel"];

type EscrowTab = "standard" | "marketing" | "supply";

export function EscrowPanel() {
  const [tab, setTab] = useState<EscrowTab>("standard");
  const [escrows, setEscrows] = useState<EscrowContract[]>([]);
  const [marketing, setMarketing] = useState<MarketingEscrow[]>([]);
  const [supply, setSupply] = useState<SupplyChainEscrow[]>([]);
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("10");
  const [currency, setCurrency] = useState("USDC");
  const [creator, setCreator] = useState("");
  const [campaign, setCampaign] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  function refresh() {
    invoke<EscrowContract[]>("list_escrows").then(setEscrows).catch(() => setEscrows([]));
    invoke<MarketingEscrow[]>("list_marketing_escrows").then(setMarketing).catch(() => setMarketing([]));
    invoke<SupplyChainEscrow[]>("list_supply_escrows").then(setSupply).catch(() => setSupply([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (tab === "standard") {
        await invoke("create_escrow", { sellerId: seller, amount: parseFloat(amount), currency });
        setSeller("");
      } else if (tab === "marketing") {
        await invoke("create_marketing_escrow", {
          creatorId: creator,
          campaignName: campaign,
          amount: parseFloat(amount),
        });
        setCreator("");
        setCampaign("");
      } else {
        await invoke("create_supply_escrow", {
          supplierId: supplier,
          sku,
          quantity: parseInt(quantity, 10),
          amount: parseFloat(amount),
        });
        setSupplier("");
        setSku("");
      }
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="panel">
      <h1>Escrow contracts</h1>
      <p className="panel-sub">Haskell escrow engine · standard · marketing · supply chain · 60s minimum billable</p>

      <div className="phone-tabs">
        {(["standard", "marketing", "supply"] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <form className="inline-form" onSubmit={handleCreate}>
        {tab === "standard" && (
          <>
            <input placeholder="Seller username" value={seller} onChange={(e) => setSeller(e.target.value)} required />
            <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
              <option value="USDC">USDC</option>
              <option value="XLM">XLM</option>
            </select>
          </>
        )}
        {tab === "marketing" && (
          <>
            <input placeholder="Creator username" value={creator} onChange={(e) => setCreator(e.target.value)} required />
            <input placeholder="Campaign name" value={campaign} onChange={(e) => setCampaign(e.target.value)} required />
            <input placeholder="Amount USDC" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </>
        )}
        {tab === "supply" && (
          <>
            <input placeholder="Supplier username" value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
            <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
            <input placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <input placeholder="Amount USDC" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </>
        )}
        <button type="submit" className="btn-secondary">New escrow</button>
      </form>
      {error && <p className="error">{error}</p>}

      {tab === "standard" && (
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
                  <button
                    key={t}
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      setError("");
                      try {
                        await invoke("transition_escrow", { contractId: e.contractId, requestType: t });
                        refresh();
                      } catch (err) {
                        setError(String(err));
                      }
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "marketing" && (
        <ul className="escrow-list">
          {marketing.length === 0 && <li className="empty">No marketing escrows</li>}
          {marketing.map((m) => (
            <li key={m.marketingId} className="escrow-item">
              <div>
                <strong>{m.campaignName}</strong>
                <span>{m.brandId} → {m.creatorId} · {m.amount} USDC</span>
                <span className="escrow-status">{m.status}</span>
              </div>
              <div className="escrow-actions">
                {MKT_TRANSITIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      setError("");
                      try {
                        await invoke("transition_marketing_escrow", { marketingId: m.marketingId, requestType: t });
                        refresh();
                      } catch (err) {
                        setError(String(err));
                      }
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "supply" && (
        <ul className="escrow-list">
          {supply.length === 0 && <li className="empty">No supply chain escrows</li>}
          {supply.map((s) => (
            <li key={s.supplyId} className="escrow-item">
              <div>
                <strong>{s.sku}</strong>
                <span>{s.buyerId} → {s.supplierId} · qty {s.quantity} · {s.amount} USDC</span>
                <span className="escrow-status">{s.status}</span>
              </div>
              <div className="escrow-actions">
                {SUP_TRANSITIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      setError("");
                      try {
                        await invoke("transition_supply_escrow", { supplyId: s.supplyId, requestType: t });
                        refresh();
                      } catch (err) {
                        setError(String(err));
                      }
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
