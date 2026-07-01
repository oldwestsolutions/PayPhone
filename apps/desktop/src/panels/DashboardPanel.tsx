import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DashboardStats } from "../types";

export function DashboardPanel({ username }: { username: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    invoke<DashboardStats>("get_dashboard_stats").then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="panel">
      <h1>Dashboard</h1>
      <p className="panel-sub">Welcome back, @{username}</p>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Recent calls</span>
          <span className="stat-value">{stats?.calls_count ?? "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Contacts</span>
          <span className="stat-value">{stats?.contacts_count ?? "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active escrows</span>
          <span className="stat-value">{stats?.escrows_active ?? "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rules engine</span>
          <span className={`stat-badge ${stats?.escrow_engine_online ? "online" : "offline"}`}>
            {stats?.escrow_engine_online ? "Haskell online" : "Local fallback"}
          </span>
        </div>
      </div>
    </div>
  );
}
