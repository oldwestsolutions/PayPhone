import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CallRecord, Contact, DashboardStats, PlaceCallResult, UserAccount, UsernameRules } from "../types";
import { validateStellarUsername } from "../types";

const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function formatCallTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommunicationsPanel({ user }: { user: UserAccount }) {
  const [tab, setTab] = useState<"overview" | "dialer" | "history" | "contacts">("overview");
  const [dial, setDial] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notice, setNotice] = useState("");
  const [calling, setCalling] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [rules, setRules] = useState<UsernameRules | null>(null);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  const usernameError = useMemo(
    () => (rules ? validateStellarUsername(user.username, rules) : null),
    [user.username, rules]
  );
  const canCall = !usernameError && user.storage_paid && !!user.personal_phone;

  const refresh = useCallback(async () => {
    const [c, h, s] = await Promise.all([
      invoke<Contact[]>("get_contacts").catch(() => []),
      invoke<CallRecord[]>("get_call_history").catch(() => []),
      invoke<DashboardStats>("get_dashboard_stats").catch(() => null),
    ]);
    setContacts(c);
    setCalls(h);
    setStats(s);
  }, []);

  useEffect(() => {
    refresh();
    invoke<UsernameRules>("get_username_rules").then(setRules).catch(() => {});
  }, [refresh]);

  async function startCall(target?: string) {
    const n = target || dial;
    if (!n.trim()) return;
    if (!user.personal_phone) {
      setNotice("Connect your personal phone line in Settings before calling.");
      return;
    }
    if (usernameError) {
      setNotice(`Calls blocked: ${usernameError}`);
      return;
    }
    setCalling(true);
    try {
      const result = await invoke<PlaceCallResult>("place_call", { number: n });
      setNotice(result.message);
      setActiveSession(result.connected ? result.session_id : null);
      setCalls((p) => [result.record, ...p]);
      if (!target) setDial("");
    } catch (err) {
      setNotice(String(err));
      setActiveSession(null);
    } finally {
      setCalling(false);
    }
  }

  async function hangUp() {
    await invoke("end_call");
    setActiveSession(null);
    setNotice("Call ended. Outbound ID shown as RESTRICTED.");
  }

  return (
    <div className="panel communications-panel">
      <header className="comm-header">
        <div>
          <h1>Communications</h1>
          <p className="panel-sub">@{user.username} · name-to-name · caller ID RESTRICTED</p>
        </div>
        <div className="comm-status-row">
          <span className={stats?.telephony_engine_online ? "pill online" : "pill"}>Telephony</span>
          <span className={stats?.personal_phone_connected ? "pill online" : "pill warn"}>Phone line</span>
          <span className={stats?.escrow_engine_online ? "pill online" : "pill"}>Escrow</span>
        </div>
      </header>

      <div className="phone-tabs">
        {(["overview", "dialer", "history", "contacts"] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {!user.personal_phone && (
        <div className="call-block-banner" role="alert">
          <strong>Phone line required</strong>
          <p>Connect your personal mobile number in Settings to place name-to-name calls.</p>
        </div>
      )}

      {usernameError && (
        <div className="call-block-banner" role="alert">
          <strong>Invalid Stellar name</strong>
          <p>{usernameError}</p>
        </div>
      )}

      {activeSession && (
        <div className="call-active-banner">
          <span>On call · callee sees RESTRICTED</span>
          <button type="button" className="btn-secondary" onClick={hangUp}>End call</button>
        </div>
      )}

      {notice && <p className="call-status">{notice}</p>}

      {tab === "overview" && stats && (
        <div className="stat-grid">
          <div className="stat-card glass">
            <span className="stat-label">Recent calls</span>
            <span className="stat-value">{stats.calls_count}</span>
          </div>
          <div className="stat-card glass">
            <span className="stat-label">Contacts</span>
            <span className="stat-value">{stats.contacts_count}</span>
          </div>
          <div className="stat-card glass">
            <span className="stat-label">Active escrows</span>
            <span className="stat-value">{stats.escrows_active}</span>
          </div>
          <div className="stat-card glass">
            <span className="stat-label">Your masked line</span>
            <span className="stat-value small">{user.masked_number || "—"}</span>
          </div>
        </div>
      )}

      {tab === "dialer" && (
        <div className="dialer">
          <p className="hint">Dial a Stellar name (e.g. alex.42line) or number. Calls bridge via Haskell middleware.</p>
          <input
            className="dial-display"
            value={dial}
            onChange={(e) => setDial(e.target.value)}
            placeholder="@stellar.name"
            aria-label="Stellar name or number"
          />
          <div className="dial-grid">
            {DIAL_KEYS.map((k) => (
              <button key={k} type="button" className="dial-key" onClick={() => setDial((d) => d + k)}>{k}</button>
            ))}
          </div>
          <div className="dial-actions">
            <button type="button" className="call-btn" disabled={calling || !dial.trim() || !canCall} onClick={() => startCall()}>
              Call
            </button>
            <button type="button" className="clear-btn" disabled={!dial} onClick={() => setDial("")}>Clear</button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <ul className="list-plain">
          {calls.length === 0 && <li className="empty">No calls yet.</li>}
          {calls.map((c) => (
            <li key={c.id}>
              <button type="button" className="list-btn" onClick={() => startCall(c.peer_name || c.number)} disabled={!canCall}>
                <span className="restricted-badge">RESTRICTED</span> ↗ {c.peer_name || c.number}
                <span>{formatCallTime(c.started_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "contacts" && (
        <>
          {user.storage_paid && (
            <form
              className="inline-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const updated = await invoke<Contact[]>("save_contact", {
                  contact: { name: newName, number: newNumber, company: null },
                });
                setContacts(updated);
                setNewName("");
                setNewNumber("");
              }}
            >
              <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <input placeholder="Stellar name" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} required />
              <button type="submit" className="btn-secondary">Add</button>
            </form>
          )}
          <ul className="list-plain">
            {contacts.map((c) => (
              <li key={c.number}>
                <button type="button" className="list-btn" onClick={() => startCall(c.number)} disabled={!canCall}>
                  <strong>{c.name}</strong> {c.number}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
