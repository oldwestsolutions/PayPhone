import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DashboardStats, UserAccount, WalletSummary } from "../types";

export function HomePanel({
  user,
  onNavigate,
}: {
  user: UserAccount;
  onNavigate: (section: string) => void;
}) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const refresh = useCallback(async () => {
    const [w, s] = await Promise.all([
      invoke<WalletSummary>("get_wallet_summary").catch(() => null),
      invoke<DashboardStats>("get_dashboard_stats").catch(() => null),
    ]);
    setWallet(w);
    setStats(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="panel panel-wide">
      <div className="app-topbar">
        <div>
          <div className="topbar-user">@{user.username}</div>
          <div className="topbar-balance">{wallet?.circle_usdc ?? "—"} USDC</div>
        </div>
        <span className={`pill ${user.personal_phone ? "online" : "warn"}`}>
          {user.personal_phone ? "Line connected" : "Connect phone in Settings"}
        </span>
      </div>

      <h1 style={{ marginTop: 20 }}>Home</h1>
      <p className="panel-sub">Calls · Messages · Money · Orders — all in one place</p>

      <div className="quick-actions">
        <button type="button" className="quick-chip" onClick={() => onNavigate("communications")}>
          📞 Call
        </button>
        <button type="button" className="quick-chip" onClick={() => onNavigate("messages")}>
          💬 Message
        </button>
        <button type="button" className="quick-chip" onClick={() => onNavigate("wallet")}>
          💵 Send USDC
        </button>
        <button type="button" className="quick-chip" onClick={() => onNavigate("escrow")}>
          📦 New order
        </button>
        <button type="button" className="quick-chip" onClick={() => onNavigate("procurement")}>
          🚚 Procurement
        </button>
      </div>

      <div className="home-grid">
        <button type="button" className="home-card green" onClick={() => onNavigate("wallet")}>
          <h3>Balance</h3>
          <div className="big">${wallet?.circle_usdc ?? "0"}</div>
        </button>
        <button type="button" className="home-card" onClick={() => onNavigate("communications")}>
          <h3>Calls</h3>
          <div className="big">{stats?.calls_count ?? 0}</div>
        </button>
        <button type="button" className="home-card" onClick={() => onNavigate("escrow")}>
          <h3>Active orders</h3>
          <div className="big">{stats?.escrows_active ?? 0}</div>
        </button>
        <button type="button" className="home-card" onClick={() => onNavigate("business")}>
          <h3>Platform fees</h3>
          <div className="big" style={{ fontSize: 22 }}>Revenue →</div>
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card glass">
          <span className="stat-label">Telephony</span>
          <span className={`stat-badge ${stats?.telephony_engine_online ? "online" : "offline"}`}>
            {stats?.telephony_engine_online ? "Online" : "Offline"}
          </span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">Escrow engine</span>
          <span className={`stat-badge ${stats?.escrow_engine_online ? "online" : "offline"}`}>
            {stats?.escrow_engine_online ? "Online" : "Offline"}
          </span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">Comms credits</span>
          <span className="stat-value small">{user.comms_credits.toLocaleString()}</span>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">Storage</span>
          <span className="stat-value small">{user.storage_credits_gib} GiB</span>
        </div>
      </div>
    </div>
  );
}
