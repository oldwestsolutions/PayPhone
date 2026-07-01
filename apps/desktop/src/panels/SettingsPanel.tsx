import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UserAccount } from "../types";

export function SettingsPanel({ user, onLogout }: { user: UserAccount; onLogout: () => void }) {
  const [phone, setPhone] = useState(user.personal_phone || "");
  const [accountType, setAccountType] = useState(user.account_type || "consumer");
  const [callToll, setCallToll] = useState(user.account_type === "business" ? "" : "");
  const [smsToll, setSmsToll] = useState("");
  const [gift, setGift] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function connectPhone(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await invoke("connect_personal_phone", {
        personalPhone: phone,
        accountType,
        callTollUsdc: accountType === "business" && callToll ? parseFloat(callToll) : null,
        smsTollUsdc: accountType === "business" && smsToll ? parseFloat(smsToll) : null,
        messageGiftUsdc: gift ? parseFloat(gift) : null,
      });
      setNotice("Personal phone line connected. Name-to-name calls enabled.");
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="panel settings-panel">
      <h1>Settings</h1>
      <p className="panel-sub">Connect your real phone line — outbound calls show as RESTRICTED</p>

      <form className="wallet-card glass" onSubmit={connectPhone}>
        <h2>Personal phone line</h2>
        <label>
          Mobile number
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" required />
        </label>
        <label>
          Account type
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option value="consumer">Consumer (gifts only)</option>
            <option value="business">Business (can charge tolls)</option>
          </select>
        </label>
        {accountType === "business" && (
          <>
            <label>
              Call toll (USDC)
              <input type="number" step="0.01" min="0" value={callToll} onChange={(e) => setCallToll(e.target.value)} placeholder="Per answered call" />
            </label>
            <label>
              SMS toll (USDC)
              <input type="number" step="0.01" min="0" value={smsToll} onChange={(e) => setSmsToll(e.target.value)} placeholder="Per message opened" />
            </label>
          </>
        )}
        {accountType === "consumer" && (
          <label>
            Message/call gift offer (USDC)
            <input type="number" step="0.01" min="0" value={gift} onChange={(e) => setGift(e.target.value)} placeholder="Optional gift for answering" />
          </label>
        )}
        <button type="submit" className="btn-primary">Save phone line</button>
        {error && <p className="error">{error}</p>}
        {notice && <p className="call-status">{notice}</p>}
      </form>

      <div className="wallet-card glass">
        <div className="wallet-row"><span>Stellar name</span><strong>@{user.username}</strong></div>
        <div className="wallet-row"><span>Stellar key</span><code>{user.stellar_public_key}</code></div>
        <div className="wallet-row"><span>Circle address</span><code>{user.circle_wallet_address}</code></div>
        <div className="wallet-row"><span>Storage</span><span>{user.storage_paid ? "Active" : "Not activated"}</span></div>
      </div>

      <button type="button" className="btn-secondary mt-4" onClick={onLogout}>Sign out</button>
    </div>
  );
}
