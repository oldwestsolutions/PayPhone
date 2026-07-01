import type { UserAccount } from "../types";

export function SettingsPanel({ user, onLogout }: { user: UserAccount; onLogout: () => void }) {
  return (
    <div className="panel">
      <h1>Settings</h1>
      <div className="wallet-card">
        <div className="wallet-row"><span>Username</span><strong>@{user.username}</strong></div>
        <div className="wallet-row"><span>Email</span><span>{user.email}</span></div>
        <div className="wallet-row"><span>Storage</span><span>{user.storage_paid ? "Active" : "Not activated"}</span></div>
        <div className="wallet-row"><span>Stellar key</span><code>{user.stellar_public_key}</code></div>
      </div>
      <button type="button" className="btn-secondary mt-4" onClick={onLogout}>Sign out</button>
    </div>
  );
}
