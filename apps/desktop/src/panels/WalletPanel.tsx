import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SendUsdcResult, WalletSummary } from "../types";

export function WalletPanel() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [sendResult, setSendResult] = useState<SendUsdcResult | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setWallet(await invoke<WalletSummary>("get_wallet_summary"));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSendResult(null);
    try {
      const result = await invoke<SendUsdcResult>("send_usdc", {
        toUsername: toUser.replace(/^@/, ""),
        amount: parseFloat(amount),
      });
      setSendResult(result);
      setToUser("");
      setAmount("");
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  const fee = amount ? (parseFloat(amount) * 0.01).toFixed(2) : "0.00";

  return (
    <div className="panel panel-wide">
      <h1>Wallet</h1>
      <p className="panel-sub">Cash App-style USDC · Circle mainnet · 1% platform fee on sends</p>
      {error && <p className="error">{error}</p>}

      {wallet && (
        <>
          <div className="wallet-hero">
            <div className="wallet-hero-label">Available balance</div>
            <div className="wallet-hero-amount">${wallet.circle_usdc}</div>
            <div className="wallet-hero-sub">
              {wallet.circle_live ? "Circle live" : "Demo mode"} · {wallet.balance_xlm} XLM identity
            </div>
          </div>

          <div className="wallet-actions">
            <button type="button" className="wallet-action-btn send" onClick={() => setShowSend(!showSend)}>
              Send
            </button>
            <button type="button" className="wallet-action-btn" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>

          {showSend && (
            <form className="send-form" onSubmit={handleSend}>
              <input
                placeholder="To @username"
                value={toUser}
                onChange={(e) => setToUser(e.target.value)}
                required
              />
              <input
                placeholder="Amount USDC"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <p className="fee-hint">Platform fee (1%): ${fee} · Recipient gets ${amount ? (parseFloat(amount) * 0.99).toFixed(2) : "0.00"}</p>
              <button type="submit" className="btn-primary">Send USDC</button>
            </form>
          )}

          {sendResult && (
            <p className="call-status">
              Sent ${sendResult.amount_sent.toFixed(2)} · Fee ${sendResult.platform_fee.toFixed(2)} · Tx {sendResult.transaction_id}
            </p>
          )}

          <div className="wallet-card">
            <div className="wallet-row">
              <span>Circle wallet</span>
              <code>{wallet.circle_wallet_id}</code>
            </div>
            <div className="wallet-row">
              <span>Polygon address</span>
              <code>{wallet.circle_address}</code>
            </div>
            <div className="wallet-row">
              <span>Stellar dial</span>
              <code>{wallet.public_key}</code>
            </div>
          </div>
        </>
      )}
      {loading && !wallet && <p className="hint">Loading…</p>}
    </div>
  );
}
