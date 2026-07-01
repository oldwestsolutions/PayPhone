import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WalletSummary } from "../types";

export function WalletPanel() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    invoke<WalletSummary>("get_wallet_summary")
      .then(setWallet)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="panel">
      <h1>Wallet</h1>
      <p className="panel-sub">Stellar primary rail · Circle abstraction ready</p>
      {error && <p className="error">{error}</p>}
      {wallet && (
        <div className="wallet-card">
          <div className="wallet-row">
            <span>Provider</span>
            <strong>{wallet.provider}</strong>
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
            <span>Circle address</span>
            <code>{wallet.circle_address}</code>
          </div>
          <div className="wallet-row">
            <span>Status</span>
            <span className={wallet.funded ? "stat-badge online" : "stat-badge offline"}>
              {wallet.funded ? "Funded" : "Awaiting funding"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
