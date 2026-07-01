import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CreditPurchaseResult, PayQuote, UserAccount } from "../types";

export function PayPanel({ user, onCreditsUpdated }: { user: UserAccount; onCreditsUpdated?: (u: UserAccount) => void }) {
  const [storageGib, setStorageGib] = useState("1");
  const [transferMib, setTransferMib] = useState("100");
  const [quote, setQuote] = useState<PayQuote | null>(null);
  const [usdcAmount, setUsdcAmount] = useState("5");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadQuote() {
    setError("");
    try {
      const q = await invoke<PayQuote>("get_pay_quote", {
        storageGib: parseFloat(storageGib) || 0,
        transferMib: parseFloat(transferMib) || 0,
        reason: "filecoin_storage_and_transfer",
      });
      setQuote(q);
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    loadQuote();
  }, []);

  async function purchase() {
    setBusy(true);
    setError("");
    try {
      const result = await invoke<CreditPurchaseResult>("purchase_credits", {
        usdcAmount: parseFloat(usdcAmount),
      });
      setNotice(
        `Purchased ${result.storage_gib_months} GiB-month storage + ${result.comms_units} comms units via ${result.solidity_contract} (${result.tx_ref}).`
      );
      const session = await invoke<UserAccount | null>("get_session");
      if (session && onCreditsUpdated) {
        onCreditsUpdated({ ...user, ...session });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const lowStorage = user.storage_credits_gib < 1;

  return (
    <div className="panel pay-panel">
      <h1>Pay &amp; credits</h1>
      <p className="panel-sub">
        Filecoin storage tolls · data transfer · comms credits · settled via PayPhoneCredits (Solidity) + Circle USDC
      </p>

      {lowStorage && (
        <div className="call-block-banner" role="alert">
          <strong>Storage low</strong>
          <p>You have {user.storage_credits_gib.toFixed(2)} GiB-month credits. Top up to keep call history and shared recordings.</p>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card glass">
          <span className="stat-label">Storage credits</span>
          <span className="stat-value">{user.storage_credits_gib.toFixed(2)} GiB-mo</span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">Comms credits</span>
          <span className="stat-value">{user.comms_credits.toFixed(0)}</span>
        </div>
      </div>

      <section className="glass pay-quote-section">
        <h2>Filecoin quote (Haskell)</h2>
        <div className="inline-form">
          <input
            type="number"
            step="0.1"
            min="0"
            value={storageGib}
            onChange={(e) => setStorageGib(e.target.value)}
            placeholder="GiB-months"
            aria-label="Storage GiB-months"
          />
          <input
            type="number"
            step="1"
            min="0"
            value={transferMib}
            onChange={(e) => setTransferMib(e.target.value)}
            placeholder="Transfer MiB"
            aria-label="Transfer MiB"
          />
          <button type="button" className="btn-secondary" onClick={loadQuote}>
            Refresh quote
          </button>
        </div>
        {quote && (
          <p className="hint">
            ${quote.totalUsdc.toFixed(2)} USDC — storage @ ${quote.filecoinRate}/GiB-mo · transfer @ ${quote.transferRate}/MiB
          </p>
        )}
      </section>

      <section className="glass pay-purchase-section">
        <h2>Purchase credits (Solidity PayPhoneCredits)</h2>
        <div className="inline-form">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            placeholder="USDC amount"
            aria-label="USDC amount"
          />
          <button type="button" className="btn-primary" disabled={busy} onClick={purchase}>
            Pay with USDC
          </button>
        </div>
        <p className="hint">1 USDC ≈ 1 GiB-month Filecoin storage + 1,000 comms units (matches on-chain contract).</p>
      </section>

      {error && <p className="error">{error}</p>}
      {notice && <p className="call-status">{notice}</p>}
    </div>
  );

}
