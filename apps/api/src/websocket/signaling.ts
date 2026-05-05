import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import type { Server } from "http";
import { CallSession } from "../models/session.js";
import type { CallSessionDoc } from "../models/session.js";
import { verifyRawMessage } from "../crypto/did.js";
import { config } from "../config.js";

type Role = "client" | "provider";

type Peer = { ws: WebSocket; role: Role; did: string };

const rooms = new Map<string, Map<string, Peer>>();

function getRoom(sessionId: string): Map<string, Peer> {
  let r = rooms.get(sessionId);
  if (!r) {
    r = new Map();
    rooms.set(sessionId, r);
  }
  return r;
}

function safeSend(ws: WebSocket, data: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function attachSignaling(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    let sessionId: string | null = null;
    let authenticated = false;

    ws.on("message", async (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        safeSend(ws, { type: "error", code: "invalid_json" });
        ws.close();
        return;
      }

      if (!authenticated) {
        if (msg.type !== "auth") {
          safeSend(ws, { type: "error", code: "auth_required" });
          ws.close();
          return;
        }

        const sid = String(msg.sessionId ?? "");
        const role = msg.role as Role;
        const ts = String(msg.timestamp ?? "");
        const sig = String(msg.signature ?? "");
        const did = String(msg.did ?? "");

        if (!sid || (role !== "client" && role !== "provider") || !ts || !sig || !did) {
          safeSend(ws, { type: "error", code: "invalid_auth" });
          ws.close();
          return;
        }

        const now = Date.now();
        const t = Number(ts);
        if (!Number.isFinite(t) || Math.abs(now - t) > config.maxSignatureAgeMs) {
          safeSend(ws, { type: "error", code: "stale_timestamp" });
          ws.close();
          return;
        }

        const messageUtf8 = `ws.auth.${sid}.${role}.${ts}`;
        const ok = verifyRawMessage({
          publicKeyB64Url: did,
          signatureB64Url: sig,
          messageUtf8,
        });
        if (!ok) {
          safeSend(ws, { type: "error", code: "invalid_signature" });
          ws.close();
          return;
        }

        const doc = await CallSession.findOne({ sessionId: sid }).lean<CallSessionDoc | null>();
        if (!doc) {
          safeSend(ws, { type: "error", code: "session_not_found" });
          ws.close();
          return;
        }

        const expectedDid =
          role === "client" ? doc.clientDid : doc.providerDid;
        if (expectedDid !== did) {
          safeSend(ws, { type: "error", code: "did_mismatch" });
          ws.close();
          return;
        }

        sessionId = sid;
        authenticated = true;
        const room = getRoom(sid);
        room.set(role, { ws, role, did });
        safeSend(ws, { type: "authed", sessionId: sid, role });
        return;
      }

      const room = sessionId ? getRoom(sessionId) : null;
      if (!room) return;

      const self = [...room.values()].find((p) => p.ws === ws);
      if (!self) return;

      const relayTypes = ["offer", "answer", "ice", "quality"];
      const t = String(msg.type ?? "");
      if (!relayTypes.includes(t)) {
        safeSend(ws, { type: "error", code: "unknown_type" });
        return;
      }

      const peer = [...room.values()].find((p) => p.ws !== ws);
      if (peer) {
        safeSend(peer.ws, { ...msg, from: self.role });
      }
    });

    ws.on("close", () => {
      if (!sessionId) return;
      const room = rooms.get(sessionId);
      if (!room) return;
      for (const [role, p] of room) {
        if (p.ws === ws) room.delete(role);
      }
      if (room.size === 0) rooms.delete(sessionId);
    });
  });
}
