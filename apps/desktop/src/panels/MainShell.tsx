import type { UserAccount, AppSection } from "../types";
import { PhoneIcon } from "../components/PhoneIcon";
import { HomePanel } from "./HomePanel";
import { CommunicationsPanel } from "./CommunicationsPanel";
import { WalletPanel } from "./WalletPanel";
import { EscrowPanel } from "./EscrowPanel";
import { ProcurementPanel } from "./ProcurementPanel";
import { BusinessPanel } from "./BusinessPanel";
import { AdminPanel, BondPanel } from "./AdminBondPanels";
import { SwapPanel } from "./SwapPanel";
import { RoutingPanel } from "./RoutingPanel";
import { MessagesPanel } from "./MessagesPanel";
import { CalendarPanel } from "./CalendarPanel";
import { SettingsPanel } from "./SettingsPanel";
import { PayPanel } from "./PayPanel";

const NAV: { id: AppSection; label: string; icon: string }[] = [
  { id: "communications", label: "Phone", icon: "◎" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "wallet", label: "Wallet", icon: "$" },
  { id: "swap", label: "Swap", icon: "⇄" },
  { id: "routes", label: "Routes", icon: "↯" },
  { id: "escrow", label: "Orders", icon: "📦" },
  { id: "procurement", label: "Procurement", icon: "🚚" },
  { id: "bonds", label: "Bonds", icon: "🔒" },
  { id: "pay", label: "Pay", icon: "◈" },
  { id: "home", label: "Home", icon: "⌂" },
  { id: "business", label: "Revenue", icon: "📈" },
  { id: "calendar", label: "Calendar", icon: "▦" },
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
          <PhoneIcon size={28} className="brand-bell" />
          <div>
            <span className="brand-title">Payphone</span>
            <span className="brand-sub">Intent · Route · Execute</span>
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
          {user.role === "admin" && (
            <button
              type="button"
              className={section === "admin" ? "active" : ""}
              onClick={() => onSection("admin")}
            >
              <span className="nav-icon">⚖</span>
              Admin
            </button>
          )}
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
                Open Pay
              </button>
            </p>
          </div>
        )}
        {section === "communications" && <CommunicationsPanel user={user} />}
        {section === "messages" && <MessagesPanel user={user} />}
        {section === "calendar" && <CalendarPanel />}
        {section === "wallet" && <WalletPanel />}
        {section === "swap" && <SwapPanel user={user} />}
        {section === "routes" && <RoutingPanel />}
        {section === "pay" && <PayPanel user={user} onCreditsUpdated={onUserUpdate} />}
        {section === "escrow" && <EscrowPanel />}
        {section === "procurement" && <ProcurementPanel />}
        {section === "bonds" && <BondPanel user={user} />}
        {section === "business" && <BusinessPanel />}
        {user.role === "admin" && section === "admin" && <AdminPanel />}
        {section === "home" && <HomePanel user={user} onNavigate={(s) => onSection(s as AppSection)} />}
        {section === "settings" && (
          <SettingsPanel user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
        )}
      </main>
    </div>
  );
}
