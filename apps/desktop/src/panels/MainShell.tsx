import type { AppSection, UserAccount } from "../types";
import { Bell } from "../components/Bell";
import { DashboardPanel } from "./DashboardPanel";
import { WalletPanel } from "./WalletPanel";
import { EscrowPanel } from "./EscrowPanel";
import { PhonePanel } from "./PhonePanel";
import { SettingsPanel } from "./SettingsPanel";

const NAV: { id: AppSection; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "wallet", label: "Wallet" },
  { id: "escrow", label: "Escrow" },
  { id: "phone", label: "Phone" },
  { id: "settings", label: "Settings" },
];

export function MainShell({
  user,
  section,
  onSection,
  onLogout,
}: {
  user: UserAccount;
  section: AppSection;
  onSection: (s: AppSection) => void;
  onLogout: () => void;
}) {
  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <Bell className="brand-bell" />
          <div>
            <span className="brand-title">Payphone</span>
            <span className="brand-sub">Enterprise</span>
          </div>
        </div>
        <nav className="shell-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "active" : ""}
              onClick={() => onSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shell-user">
          <p>@{user.username}</p>
          <span className={user.storage_paid ? "dot online" : "dot"} />
        </div>
      </aside>
      <main className="shell-main">
        {section === "dashboard" && <DashboardPanel username={user.username} />}
        {section === "wallet" && <WalletPanel />}
        {section === "escrow" && <EscrowPanel />}
        {section === "phone" && <PhonePanel user={user} />}
        {section === "settings" && <SettingsPanel user={user} onLogout={onLogout} />}
      </main>
    </div>
  );
}
