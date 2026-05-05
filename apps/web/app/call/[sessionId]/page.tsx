"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { useIdentityOptional } from "@/components/IdentityProvider";
import { createPeerConnection, openSignalingSocket } from "@/lib/signaling";

type Session = {
  sessionId: string;
  status: string;
  clientDid: string;
  providerDid: string;
  callStartedAt?: string;
  ratePerSecond: string;
};

export default function CallPage() {
  const params = useParams();
  const sessionId = String(params?.sessionId ?? "");
  const identity = useIdentityOptional();

  const [session, setSession] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [conn, setConn] = useState<string>("new");
  const [seconds, setSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const role =
    session && identity
      ? session.clientDid === identity.did
        ? ("client" as const)
        : session.providerDid === identity.did
          ? ("provider" as const)
          : null
      : null;

  async function refresh() {
    if (!identity) return;
    const s = await apiFetch<Session>(`/sessions/${sessionId}`, { identity });
    setSession(s);
  }

  useEffect(() => {
    if (!identity || !sessionId) return;
    let c = false;
    (async () => {
      try {
        await refresh();
      } catch (e) {
        if (!c) setErr(String(e));
      }
    })();
    return () => {
      c = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial
  }, [identity, sessionId]);

  useEffect(() => {
    if (!session?.callStartedAt) return;
    const start = new Date(session.callStartedAt).getTime();
    const t = window.setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [session?.callStartedAt]);

  async function accept() {
    if (!identity) return;
    await apiFetch(`/sessions/${sessionId}/accept`, {
      method: "POST",
      identity,
      body: JSON.stringify({}),
    });
    await refresh();
  }

  async function startCall() {
    if (!identity) return;
    await apiFetch(`/sessions/${sessionId}/start`, {
      method: "POST",
      identity,
      body: JSON.stringify({}),
    });
    await refresh();
  }

  async function endCall() {
    if (!identity || !session?.callStartedAt) return;
    const reported = Math.max(
      1,
      Math.floor((Date.now() - new Date(session.callStartedAt).getTime()) / 1000)
    );
    await apiFetch(`/sessions/${sessionId}/end`, {
      method: "POST",
      identity,
      body: JSON.stringify({ reportedDurationSec: reported }),
    });
    teardown();
    await refresh();
  }

  function teardown() {
    wsRef.current?.close();
    wsRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  }

  async function beginMedia() {
    if (!identity || !role || !session) return;
    setErr(null);
    teardown();

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = createPeerConnection();
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (ev) => {
      if (videoRef.current && ev.streams[0]) {
        videoRef.current.srcObject = ev.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      setConn(pc.connectionState);
    };

    const ws = await openSignalingSocket({
      sessionId,
      role,
      did: identity.did,
      secretKey: identity.secretKey,
    });
    wsRef.current = ws;

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
      if (msg.type === "offer" && role === "provider") {
        await pc.setRemoteDescription({ type: "offer", sdp: String(msg.sdp) });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
      }
      if (msg.type === "answer" && role === "client") {
        await pc.setRemoteDescription({ type: "answer", sdp: String(msg.sdp) });
      }
      if (msg.type === "ice" && msg.candidate) {
        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(JSON.parse(String(msg.candidate)) as RTCIceCandidateInit)
          );
        } catch {
          /* ignore */
        }
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        ws.send(JSON.stringify({ type: "ice", candidate: JSON.stringify(ev.candidate.toJSON()) }));
      }
    };

    if (role === "client") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
    }
  }

  if (!identity) return <p className="text-zinc-500">Loading…</p>;
  if (err && !session) return <p className="text-red-400">{err}</p>;
  if (!session) return <p className="text-zinc-500">Loading session…</p>;
  if (!role)
    return (
      <p className="text-red-400">
        Your DID is not a party to this session. Open this link in the client
        or provider browser profile.
      </p>
    );

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-zinc-500">
        ← Home
      </Link>
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold">Call</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 break-all">
            {sessionId}
          </p>
          <p className="text-sm text-zinc-400 mt-2">
            Status: {session.status} · Role: {role} · ICE/DTLS:{" "}
            <span className="text-accent">{conn}</span>
          </p>
        </div>
        <div className="text-3xl font-mono text-accent">{seconds}s</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {session.status === "created" && role === "provider" && (
          <button
            type="button"
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={() => void accept()}
          >
            Accept session
          </button>
        )}
        {(session.status === "accepted" || session.status === "created") && (
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm"
            onClick={() => void startCall()}
          >
            Mark active / start timer
          </button>
        )}
        {session.status === "active" && (
          <>
            <button
              type="button"
              className="rounded-md bg-emerald-500/90 px-3 py-2 text-sm font-medium text-zinc-950"
              onClick={() => void beginMedia().catch((e) => setErr(String(e)))}
            >
              Connect WebRTC
            </button>
            <button
              type="button"
              className="rounded-md border border-red-900 text-red-300 px-3 py-2 text-sm"
              onClick={() => void endCall()}
            >
              End & settle
            </button>
          </>
        )}
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/40 overflow-hidden">
          <div className="text-xs text-zinc-500 px-2 py-1">Remote</div>
          <video ref={videoRef} autoPlay playsInline className="w-full aspect-video bg-black" />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/40 overflow-hidden">
          <div className="text-xs text-zinc-500 px-2 py-1">Local</div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video bg-black"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Signaling API: {API_BASE} — media does not traverse payphone.cc servers.
      </p>
    </div>
  );
}
