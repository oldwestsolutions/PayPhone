import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SmsMessage, UserAccount } from "../types";

export function MessagesPanel({ user }: { user: UserAccount }) {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [toName, setToName] = useState("");
  const [body, setBody] = useState("");
  const [gift, setGift] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function refresh() {
    invoke<SmsMessage[]>("get_sms_messages").then(setMessages).catch(() => setMessages([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await invoke("send_sms", {
        toName: toName.trim(),
        body,
        giftUsdc: gift ? parseFloat(gift) : null,
      });
      setBody("");
      setGift("");
      setNotice("Message sent. Recipient sees your Stellar name only.");
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="panel">
      <h1>Messages</h1>
      <p className="panel-sub">
        SMS via Stellar names · {user.account_type === "business" ? "Business tolls enabled" : "Offer a gift to open your message"}
      </p>

      <form className="sms-compose glass" onSubmit={send}>
        <input placeholder="To @stellar.name" value={toName} onChange={(e) => setToName(e.target.value)} required />
        <textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required rows={3} />
        <input
          placeholder="Gift USDC (optional — anyone can offer)"
          value={gift}
          onChange={(e) => setGift(e.target.value)}
          type="number"
          step="0.01"
          min="0"
        />
        <button type="submit" className="btn-primary" disabled={!user.personal_phone}>
          Send
        </button>
      </form>
      {!user.personal_phone && <p className="error">Connect your phone line in Settings to send messages.</p>}
      {error && <p className="error">{error}</p>}
      {notice && <p className="call-status">{notice}</p>}

      <ul className="sms-list">
        {messages.length === 0 && <li className="empty">No messages yet.</li>}
        {messages.map((m) => (
          <li key={m.id} className="sms-item glass">
            <strong>@{m.from_name}</strong> → @{m.to_name}
            {m.gift_usdc != null && <span className="gift-badge">{m.gift_usdc} USDC gift</span>}
            <p>{m.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
