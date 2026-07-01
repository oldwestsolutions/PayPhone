import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CalendarEvent } from "../types";

export function CalendarPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState("");
  const [withName, setWithName] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");

  function refresh() {
    invoke<CalendarEvent[]>("get_calendar_events").then(setEvents).catch(() => setEvents([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = Math.floor(new Date(starts).getTime() / 1000);
    const endsAt = Math.floor(new Date(ends).getTime() / 1000);
    await invoke("create_calendar_event", {
      title,
      startsAt,
      endsAt,
      withName: withName || null,
    });
    setTitle("");
    setWithName("");
    refresh();
  }

  return (
    <div className="panel">
      <h1>Calendar</h1>
      <p className="panel-sub">Schedule name-to-name calls with Stellar identities</p>

      <form className="inline-form glass" onSubmit={addEvent}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input placeholder="With @name" value={withName} onChange={(e) => setWithName(e.target.value)} />
        <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} required />
        <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} required />
        <button type="submit" className="btn-secondary">Add</button>
      </form>

      <ul className="calendar-list">
        {events.length === 0 && <li className="empty">No events scheduled.</li>}
        {events.map((ev) => (
          <li key={ev.id} className="calendar-item glass">
            <strong>{ev.title}</strong>
            {ev.with_name && <span> with @{ev.with_name}</span>}
            <span className="calendar-time">
              {new Date(ev.starts_at * 1000).toLocaleString()} – {new Date(ev.ends_at * 1000).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
