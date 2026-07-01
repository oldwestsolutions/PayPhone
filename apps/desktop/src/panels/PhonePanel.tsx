import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CallRecord, Contact, PlaceCallResult, UserAccount } from "../types";

const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function formatCallTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PhonePanel({ user }: { user: UserAccount }) {
  const [tab, setTab] = useState<"dialer" | "history" | "contacts">("dialer");
  const [dial, setDial] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [calling, setCalling] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  const refresh = useCallback(async () => {
    const [c, h] = await Promise.all([
      invoke<Contact[]>("get_contacts").catch(() => []),
      invoke<CallRecord[]>("get_call_history").catch(() => []),
    ]);
    setContacts(c);
    setCalls(h);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function startCall(number?: string) {
    const n = number || dial;
    if (!n.trim()) return;
    setCalling(true);
    try {
      const result = await invoke<PlaceCallResult>("place_call", { number: n });
      setNotice(result.message);
      if (user.storage_paid) setCalls((p) => [result.record, ...p]);
      if (!number) setDial("");
    } catch (err) {
      setNotice(String(err));
    } finally {
      setCalling(false);
    }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updated = await invoke<Contact[]>("save_contact", {
        contact: { name: newName, number: newNumber, company: null },
      });
      setContacts(updated);
      setNewName("");
      setNewNumber("");
    } catch (err) {
      setNotice(String(err));
    }
  }

  return (
    <div className="panel phone-panel">
      <div className="phone-tabs">
        {(["dialer", "history", "contacts"] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {notice && <p className="call-status">{notice}</p>}

      {tab === "dialer" && (
        <div className="dialer">
          <input className="dial-display" value={dial} readOnly aria-label="Number" />
          <div className="dial-grid">
            {DIAL_KEYS.map((k) => (
              <button key={k} type="button" className="dial-key" onClick={() => setDial((d) => d + k)}>{k}</button>
            ))}
          </div>
          <div className="dial-actions">
            <button type="button" className="call-btn" disabled={calling || !dial.trim()} onClick={() => startCall()}>Call</button>
            <button type="button" className="clear-btn" disabled={!dial} onClick={() => setDial("")}>Clear</button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <ul className="list-plain">
          {!user.storage_paid && <li className="empty">Activate storage to save call history.</li>}
          {user.storage_paid && calls.length === 0 && <li className="empty">No calls yet.</li>}
          {calls.map((c) => (
            <li key={c.id}>
              <button type="button" className="list-btn" onClick={() => startCall(c.number)}>
                ↗ {c.number} <span>{formatCallTime(c.started_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "contacts" && (
        <>
          {user.storage_paid && (
            <form className="inline-form" onSubmit={addContact}>
              <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <input placeholder="Number" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} required />
              <button type="submit" className="btn-secondary">Add</button>
            </form>
          )}
          <ul className="list-plain">
            {!user.storage_paid && <li className="empty">Activate storage for contacts.</li>}
            {contacts.map((c) => (
              <li key={c.number}>
                <button type="button" className="list-btn" onClick={() => startCall(c.number)}>
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
