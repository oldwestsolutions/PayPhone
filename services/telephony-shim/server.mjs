/**
 * Node telephony engine — same REST API as Haskell telephony-engine (port 4010).
 * Used when Cabal/GHC is not available (e.g. Windows dev).
 */
import cors from "cors";
import express from "express";

const PORT = Number(process.env.TELEPHONY_PORT || 4010);
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const store = {
  phoneLines: new Map(),
  stellarProfiles: new Map(),
  activeCalls: new Map(),
  smsInbox: new Map(),
  calendar: new Map(),
  recordings: new Map(),
  msgCounter: 0,
};

function ok(res, data) {
  res.json({ ok: true, data });
}

function err(res, message, status = 400) {
  res.status(status).json({ ok: false, error: message });
}

function formatDialAddress(name, publicKey) {
  if (!publicKey) return `@${name}`;
  const tail =
    publicKey.length > 12
      ? `${publicKey.slice(0, 8)}…${publicKey.slice(-4)}`
      : publicKey;
  return `@${name} · ${tail}`;
}

function normalizeDialInput(raw) {
  const trimmed = String(raw || "").trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function requireSmsSignature(sig) {
  if (!sig) return "SMS requires a Stellar digital signature";
  if (sig.length < 32) return "Invalid SMS digital signature";
  return null;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payphone-telephony-engine" });
});

app.post("/v1/phones/register", (req, res) => {
  const { stellarName, personalPhone } = req.body || {};
  if (!stellarName || !personalPhone) {
    return err(res, "stellarName and personalPhone required");
  }
  const line = { ...req.body, stellarName, personalPhone };
  store.phoneLines.set(stellarName, line);
  ok(res, line);
});

app.get("/v1/phones/:name", (req, res) => {
  const line = store.phoneLines.get(req.params.name);
  if (!line) return err(res, "Phone line not registered", 404);
  ok(res, line);
});

app.post("/v1/stellar/register", (req, res) => {
  const prof = req.body;
  if (!prof?.stellarName) return err(res, "stellarName required");
  store.stellarProfiles.set(prof.stellarName, prof);
  ok(res, prof);
});

app.get("/v1/stellar/:name", (req, res) => {
  const name = req.params.name;
  const prof = store.stellarProfiles.get(name);
  if (prof) return ok(res, prof);
  ok(res, {
    stellarName: name,
    publicKey: "",
    dialAddress: formatDialAddress(name, ""),
    reachable: store.phoneLines.has(name),
  });
});

app.post("/v1/calls/name", (req, res) => {
  const { fromName, toName } = req.body || {};
  const target = normalizeDialInput(toName);
  const fromLine = store.phoneLines.get(fromName);
  if (!fromLine) return err(res, "Caller must connect a personal phone line in Settings");
  const toLine = store.phoneLines.get(target);
  if (!toLine) return err(res, "Callee has not connected a personal phone line");
  const prof = store.stellarProfiles.get(target);
  const dialAddr = formatDialAddress(target, prof?.publicKey || "");
  const sessionId = `call-${fromName}-${target}-${store.activeCalls.size}`;
  const session = {
    sessionId,
    fromName,
    toName: target,
    callerIdShown: "RESTRICTED",
    status: "Connected",
    bridgeFrom: fromLine.personalPhone,
    bridgeTo: toLine.personalPhone,
    minBillableSeconds: 60,
    toDialAddress: dialAddr,
    message: `Calling ${dialAddr}. Callee sees RESTRICTED via Payphone mask proxy.`,
  };
  store.activeCalls.set(sessionId, session);
  ok(res, session);
});

app.post("/v1/calls/:sid/end", (req, res) => {
  const session = store.activeCalls.get(req.params.sid);
  if (!session) return err(res, "Call session not found");
  const duration = Number(req.body?.durationSeconds || 0);
  store.activeCalls.delete(req.params.sid);
  ok(res, {
    session: {
      ...session,
      status: "Ended",
      message: `Call ended after ${duration}s. Billing applies after 60s minimum.`,
    },
    billableSeconds: Math.max(60, duration),
  });
});

app.post("/v1/sms/send", (req, res) => {
  const p = req.body || {};
  const sigErr = requireSmsSignature(p.digitalSignature);
  if (sigErr) return err(res, sigErr);
  const target = normalizeDialInput(p.toName);
  if (!store.phoneLines.has(target)) {
    return err(res, "Recipient has not connected a phone line");
  }
  store.msgCounter += 1;
  const msg = {
    id: `sms-${store.msgCounter}`,
    fromName: p.fromName,
    toName: target,
    body: p.body,
    sentAt: store.msgCounter,
    giftUsdc: p.giftUsdc ?? null,
    stellarPublicKey: p.stellarPublicKey || "",
    digitalSignature: p.digitalSignature,
  };
  const inbox = store.smsInbox.get(target) || [];
  inbox.unshift(msg);
  store.smsInbox.set(target, inbox);
  ok(res, msg);
});

app.get("/v1/sms/:name", (req, res) => {
  ok(res, store.smsInbox.get(req.params.name) || []);
});

app.post("/v1/calendar", (req, res) => {
  const p = req.body || {};
  const ev = {
    id: `ev-${p.ownerName}-${p.title}`,
    ownerName: p.ownerName,
    title: p.title,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    withName: p.withName ?? null,
  };
  const events = store.calendar.get(p.ownerName) || [];
  events.unshift(ev);
  store.calendar.set(p.ownerName, events);
  ok(res, ev);
});

app.get("/v1/calendar/:name", (req, res) => {
  ok(res, store.calendar.get(req.params.name) || []);
});

app.post("/v1/pay/quote", (req, res) => {
  const storageGib = Number(req.body?.storageGibMonths || 0);
  const transferMib = Number(req.body?.transferMib || 0);
  ok(res, {
    storageGibMonths: storageGib,
    transferMib,
    totalUsdc: storageGib * 0.5 + transferMib * 0.02,
    filecoinRate: 0.5,
    transferRate: 0.02,
    reason: req.body?.reason || "storage",
  });
});

app.post("/v1/recordings/register", (req, res) => {
  const { sessionId, ownerName, localPath } = req.body || {};
  const rid = `rec-${sessionId}`;
  const rec = {
    recordingId: rid,
    sessionId,
    ownerName,
    localPath,
    sharedToken: `share-${rid}`,
    createdAt: Math.floor(Date.now() / 1000),
  };
  store.recordings.set(rid, rec);
  ok(res, rec);
});

app.get("/v1/recordings/:name", (req, res) => {
  const owned = [...store.recordings.values()].filter((r) => r.ownerName === req.params.name);
  ok(res, owned);
});

app.listen(PORT, () => {
  console.log(`Payphone Telephony Engine (Node shim) on port ${PORT}`);
});
