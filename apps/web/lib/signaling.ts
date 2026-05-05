import { apiUrl } from "./api";
import { signWsAuth } from "./did";

export type IceServer = { urls: string | string[]; username?: string; credential?: string };

export function defaultIceServers(): IceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (raw) {
    try {
      return JSON.parse(raw) as IceServer[];
    } catch {
      /* fall through */
    }
  }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

export function wsSignalingUrl(): string {
  const base = apiUrl("/").replace(/\/$/, "");
  if (base.startsWith("https://")) return `wss://${base.slice("https://".length)}/ws`;
  return `ws://${base.slice("http://".length)}/ws`;
}

export async function openSignalingSocket(args: {
  sessionId: string;
  role: "client" | "provider";
  did: string;
  secretKey: Uint8Array;
}): Promise<WebSocket> {
  const ws = new WebSocket(wsSignalingUrl());
  const ts = String(Date.now());
  const signature = await signWsAuth({
    secretKey: args.secretKey,
    sessionId: args.sessionId,
    role: args.role,
    timestampMs: ts,
  });

  await new Promise<void>((resolve, reject) => {
    const to = window.setTimeout(() => reject(new Error("ws_timeout")), 10000);
    ws.addEventListener("open", () => {
      window.clearTimeout(to);
      ws.send(
        JSON.stringify({
          type: "auth",
          sessionId: args.sessionId,
          role: args.role,
          did: args.did,
          timestamp: ts,
          signature,
        })
      );
      resolve();
    });
    ws.addEventListener("error", () => {
      window.clearTimeout(to);
      reject(new Error("ws_error"));
    });
  });

  return ws;
}

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: defaultIceServers() as RTCIceServer[] });
}
