import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WalletSummary } from "../types";

export function WalletPanel() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="panel">
      <h1>Wallet</h1>
      <p className="panel-sub">Circle USDC on Polygon · Stellar identity rail</p>
      {error && <p className="error">{error}</p>}
      {loading && !wallet && <p className="hint">Loading balances…</p>}
      {wallet && (
        <div className="wallet-card">
          <div className="wallet-row">
            <span>Provider</span>
            <strong>{wallet.provider}</strong>
          </div>
          <div className="wallet-row">
            <span>Circle wallet ID</span>
            <code>{wallet.circle_wallet_id}</code>
          </div>
          <div className="wallet-row">
            <span>Circle address</span>
            <code>{wallet.circle_address}</code>
          </div>
          <div className="wallet-row">
            <span>USDC balance</span>
            <strong>{wallet.circle_usdc} USDC</strong>
          </div>
          <div className="wallet-row">
            <span>Stellar public key</span>
            <code>{wallet.public_key}</code>
          </div>
          <div className="wallet-row">
            <span>XLM balance</span>
            <strong>{wallet.balance_xlm} XLM</strong>
          </div>
          <div className="wallet-row">
            <span>Circle live</span>
            <span className={wallet.circle_live ? "stat-badge online" : "stat-badge offline"}>
              {wallet.circle_live ? "Connected" : "Demo / offline"}
            </span>
          </div>
          <div className="wallet-row">
            <span>Status</span>
            <span className={wallet.funded ? "stat-badge online" : "stat-badge offline"}>
              {wallet.funded ? "Funded" : "Awaiting funding"}
            </span>
          </div>
          {wallet.circle_balances.length > 0 && (
            <ul className="list-plain">
              {wallet.circle_balances.map((b) => (
                <li key={`${b.symbol}-${b.token_id ?? b.token_address}`}>
                  {b.symbol}: {b.amount}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
            Refresh balances
          </button>
        </div>
      )}
    </div>
  );
}
