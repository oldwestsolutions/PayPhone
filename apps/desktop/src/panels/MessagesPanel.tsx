import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SmsMessage, UserAccount } from "../types";

export function MessagesPanel({ user }: { user: UserAccount }) {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [toName, setToName] = useState("");
  const [body, setBody] = useState("");
  const [gift, setGift] = useState("");
  const [error, setError] = useState("");
  const [activeChat, setActiveChat] = useState<string | null>(null);

  function refresh() {
    invoke<SmsMessage[]>("get_sms_messages").then(setMessages).catch(() => setMessages([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  const threads = useMemo(() => {
    const map = new Map<string, SmsMessage[]>();
    for (const m of messages) {
      const peer = m.fromName === user.username ? m.toName : m.fromName;
      if (!map.has(peer)) map.set(peer, []);
      map.get(peer)!.push(m);
    }
    return [...map.entries()].sort((a, b) => {
      const ta = a[1][a[1].length - 1]?.sentAt ?? 0;
      const tb = b[1][b[1].length - 1]?.sentAt ?? 0;
      return tb - ta;
    });
  }, [messages, user.username]);

  const chatMessages = activeChat
    ? messages.filter((m) => m.fromName === activeChat || m.toName === activeChat)
    : [];

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const target = activeChat || toName.trim().replace(/^@/, "");
    try {
      await invoke<SmsMessage>("send_sms", {
        toName: target,
        body,
        giftUsdc: gift ? parseFloat(gift) : null,
      });
      setBody("");
      setGift("");
      if (!activeChat) setActiveChat(target);
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="panel panel-wide">
      <h1>Messages</h1>
      <p className="panel-sub">iMessage-style · Stellar-signed · optional USDC gift</p>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, minHeight: 480 }}>
        <div className="glass" style={{ borderRadius: 12, padding: 8, border: "1px solid var(--border)" }}>
          <p className="hint" style={{ padding: "8px 10px" }}>Chats</p>
          {threads.length === 0 && <p className="empty" style={{ padding: 10 }}>No conversations</p>}
          {threads.map(([peer, msgs]) => (
            <button
              key={peer}
              type="button"
              className="list-btn"
              style={{ borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}
              onClick={() => setActiveChat(peer)}
            >
              <strong>@{peer}</strong>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {msgs[msgs.length - 1]?.body?.slice(0, 40)}
              </span>
            </button>
          ))}
        </div>

        <div className="chat-layout" style={{ height: "auto", minHeight: 480, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {activeChat ? (
            <>
              <div className="chat-header">
                <div className="chat-avatar">{activeChat[0]?.toUpperCase()}</div>
                <div>
                  <strong>@{activeChat}</strong>
                  <p className="hint" style={{ fontSize: 11 }}>End-to-end Stellar signature</p>
                </div>
              </div>
              <div className="chat-thread">
                {chatMessages.map((m) => {
                  const out = m.fromName === user.username;
                  return (
                    <div key={m.id} className={`bubble ${out ? "out" : "in"}`}>
                      {m.body}
                      {m.giftUsdc != null && (
                        <div className="bubble-meta">🎁 {m.giftUsdc} USDC</div>
                      )}
                      <div className="bubble-meta">
                        {new Date(m.sentAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="chat-compose" onSubmit={send}>
                <input placeholder="Gift USDC (opt)" value={gift} onChange={(e) => setGift(e.target.value)} style={{ maxWidth: 100 }} />
                <textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required rows={1} />
                <button type="submit" disabled={!user.personal_phone}>➤</button>
              </form>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Select a chat or start below
              <form className="send-form" style={{ marginTop: 24, textAlign: "left" }} onSubmit={(e) => { setActiveChat(toName.replace(/^@/, "")); send(e); }}>
                <input placeholder="New chat: @username" value={toName} onChange={(e) => setToName(e.target.value)} required />
                <textarea placeholder="First message" value={body} onChange={(e) => setBody(e.target.value)} required rows={2} />
                <button type="submit" className="btn-primary" disabled={!user.personal_phone}>Start chat</button>
              </form>
            </div>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!user.personal_phone && <p className="error">Connect your phone line in Settings to send messages.</p>}
    </div>
  );
}
