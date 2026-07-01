import type { AppSection, UserAccount } from "../types";
import { Bell } from "../components/Bell";
import { CommunicationsPanel } from "./CommunicationsPanel";
import { WalletPanel } from "./WalletPanel";
import { EscrowPanel } from "./EscrowPanel";
import { MessagesPanel } from "./MessagesPanel";
import { CalendarPanel } from "./CalendarPanel";
import { SettingsPanel } from "./SettingsPanel";

const NAV: { id: AppSection; label: string; icon: string }[] = [
  { id: "communications", label: "Phone", icon: "◎" },
  { id: "messages", label: "Messages", icon: "✉" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "wallet", label: "Wallet", icon: "◇" },
  { id: "escrow", label: "Escrow", icon: "⛓" },
  { id: "settings", label: "Settings", icon: "⚙" },
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
    <div className="shell rc-shell">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <Bell className="brand-bell" />
          <div>
            <span className="brand-title">Payphone</span>
            <span className="brand-sub">Communications</span>
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
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shell-user">
          <p>@{user.username}</p>
          <span className={user.personal_phone ? "dot online" : "dot"} title={user.personal_phone ? "Phone connected" : "No phone"} />
        </div>
      </aside>
      <main className="shell-main">
        {section === "communications" && <CommunicationsPanel user={user} />}
        {section === "messages" && <MessagesPanel user={user} />}
        {section === "calendar" && <CalendarPanel />}
        {section === "wallet" && <WalletPanel />}
        {section === "escrow" && <EscrowPanel />}
        {section === "settings" && <SettingsPanel user={user} onLogout={onLogout} />}
      </main>
    </div>
  );
}
