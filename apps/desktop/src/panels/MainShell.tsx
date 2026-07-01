import type { AppSection, UserAccount } from "../types";
import { Bell } from "../components/Bell";
import { CommunicationsPanel } from "./CommunicationsPanel";
import { WalletPanel } from "./WalletPanel";
import { EscrowPanel } from "./EscrowPanel";
import { MessagesPanel } from "./MessagesPanel";
import { CalendarPanel } from "./CalendarPanel";
import { SettingsPanel } from "./SettingsPanel";
import { PayPanel } from "./PayPanel";

const NAV: { id: AppSection; label: string; icon: string }[] = [
  { id: "communications", label: "Phone", icon: "◎" },
  { id: "messages", label: "Messages", icon: "✉" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "wallet", label: "Wallet", icon: "◇" },
  { id: "pay", label: "Pay", icon: "◈" },
  { id: "escrow", label: "Escrow", icon: "⛓" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function MainShell({
  user,
  section,
  onSection,
  onLogout,
  onUserUpdate,
}: {
  user: UserAccount;
  section: AppSection;
  onSection: (s: AppSection) => void;
  onLogout: () => void;
  onUserUpdate?: (u: UserAccount) => void;
}) {
  const lowCredits = user.storage_credits_gib < 1 || user.comms_credits < 100;

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
              {item.id === "pay" && lowCredits && <span className="nav-warn">!</span>}
            </button>
          ))}
        </nav>
        <div className="shell-user">
          <p>@{user.username}</p>
          <span className={user.personal_phone ? "dot online" : "dot"} title={user.personal_phone ? "Phone connected" : "No phone"} />
        </div>
      </aside>
      <main className="shell-main">
        {lowCredits && section !== "pay" && (
          <div className="call-block-banner" role="status">
            <strong>Credits low</strong>
            <p>
              Storage or comms credits are running low.{" "}
              <button type="button" className="btn-ghost" onClick={() => onSection("pay")}>
                Open Pay screen
              </button>
            </p>
          </div>
        )}
        {section === "communications" && <CommunicationsPanel user={user} />}
        {section === "messages" && <MessagesPanel user={user} />}
        {section === "calendar" && <CalendarPanel />}
        {section === "wallet" && <WalletPanel />}
        {section === "pay" && <PayPanel user={user} onCreditsUpdated={onUserUpdate} />}
        {section === "escrow" && <EscrowPanel />}
        {section === "settings" && (
          <SettingsPanel user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
        )}
      </main>
    </div>
  );
}
