import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PlatformRevenue, PlatformWallet } from "../types";

export function BusinessPanel() {
  const [revenue, setRevenue] = useState<PlatformRevenue | null>(null);
  const [wallet, setWallet] = useState<PlatformWallet | null>(null);
  const [error, setError] = useState("");

  function refresh() {
    setError("");
    Promise.all([
      invoke<PlatformRevenue>("get_platform_revenue"),
      invoke<PlatformWallet>("get_platform_wallet"),
    ])
      .then(([r, w]) => {
        setRevenue(r);
        setWallet(w);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="panel panel-wide">
      <h1>Business revenue</h1>
      <p className="panel-sub">
        Platform fees from escrow (5%), P2P transfers (1%), and procurement milestones — deposited to your Circle mainnet wallet
      </p>
      {error && <p className="error">{error}</p>}

      <div className="revenue-hero">
        <h2>This month</h2>
        <div className="amount">${revenue?.month_total_usdc?.toFixed(2) ?? "0.00"}</div>
        <p className="hint" style={{ marginTop: 8 }}>
          All time: ${revenue?.all_time_total_usdc?.toFixed(2) ?? "0.00"} · {revenue?.count ?? 0} fee events
        </p>
      </div>

      <div className="wallet-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Circle platform fee wallet</h2>
        <div className="wallet-row">
          <span>Status</span>
          <strong>{wallet?.simulated ? "Demo ledger" : "Live mainnet"}</strong>
        </div>
        <div className="wallet-row">
          <span>Wallet ID</span>
          <code>{wallet?.wallet_id ?? "Set PAYPHONE_PLATFORM_FEE_WALLET_ID in .env"}</code>
        </div>
        <div className="wallet-row">
          <span>Address</span>
          <code>{wallet?.address ?? "Set PAYPHONE_PLATFORM_FEE_WALLET_ADDRESS"}</code>
        </div>
        <div className="wallet-row">
          <span>USDC balance</span>
          <strong style={{ color: "var(--cash-green)" }}>{wallet?.usdc_balance ?? "0"} USDC</strong>
        </div>
        {wallet?.note && <p className="hint">{wallet.note}</p>}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Fee breakdown (this month)</h2>
      <div className="revenue-breakdown">
        {revenue?.by_type && Object.keys(revenue.by_type).length > 0 ? (
          Object.entries(revenue.by_type).map(([type, amt]) => (
            <div key={type} className="revenue-row">
              <span>{type.replace(/_/g, " ")}</span>
              <strong>${amt.toFixed(2)}</strong>
            </div>
          ))
        ) : (
          <p className="empty">No fees collected yet. Fees accrue when users settle escrows or send USDC.</p>
        )}
      </div>

      <button type="button" className="btn-secondary mt-4" onClick={refresh}>
        Refresh
      </button>

      <div className="wallet-card mt-4" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>Setup for live mainnet</h2>
        <p className="hint" style={{ lineHeight: 1.6 }}>
          1. Create a Circle developer wallet on MATIC mainnet for your business.<br />
          2. Set <code>PAYPHONE_PLATFORM_FEE_WALLET_ADDRESS</code> and <code>PAYPHONE_PLATFORM_FEE_WALLET_ID</code> in .env.<br />
          3. Set <code>PAYPHONE_ESCROW_WALLET_ID</code> for the holding wallet that funds settle from.<br />
          4. Set <code>PAYPHONE_DEMO_MODE=false</code> for real USDC movement.
        </p>
      </div>
    </div>
  );
}
