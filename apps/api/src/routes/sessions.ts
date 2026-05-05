import express from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { CallSession } from "../models/session.js";
import type { CallSessionDoc } from "../models/session.js";
import { Provider } from "../models/provider.js";
import type { ProviderDoc } from "../models/provider.js";
import { fetchReputation, meetsMinimum } from "../services/reputation.js";
import { config } from "../config.js";

const router = express.Router();

const createBody = z.object({
  providerId: z.string().min(1),
  ratePerSecond: z.string().regex(/^\d+$/),
  maxDurationSec: z.number().int().positive(),
  escrowTxHash: z.string().optional(),
  chainId: z.number().int().optional(),
});

router.post("/", async (req, res) => {
  const tenant = req.tenant!;
  const clientDid = req.didPublicKeyB64!;

  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const prov = await Provider.findOne({
    tenantId: tenant.id,
    providerId: parsed.data.providerId,
  }).lean<ProviderDoc | null>();

  if (!prov) {
    res.status(400).json({ error: "provider_not_found" });
    return;
  }

  const rep = await fetchReputation(tenant, prov.did);
  if (!meetsMinimum(rep, tenant)) {
    res.status(403).json({ error: "reputation_gate" });
    return;
  }

  if (
    prov.ratePerSecond !== parsed.data.ratePerSecond ||
    prov.maxDurationSec < parsed.data.maxDurationSec
  ) {
    res.status(400).json({ error: "rate_mismatch" });
    return;
  }

  const sessionId = nanoid(24);
  await CallSession.create({
    sessionId,
    tenantId: tenant.id,
    clientDid,
    providerDid: prov.did,
    status: "created",
    ratePerSecond: parsed.data.ratePerSecond,
    maxDurationSec: parsed.data.maxDurationSec,
    escrowTxHash: parsed.data.escrowTxHash,
    chainId: parsed.data.chainId,
  });

  res.status(201).json({
    sessionId,
    signalingWsPath: `/ws?sessionId=${encodeURIComponent(sessionId)}`,
    tenantSettlement: tenant.settlementAddress,
    consensusWindowSec: config.consensusWindowSec,
  });
});

router.get("/:sessionId", async (req, res) => {
  const tenant = req.tenant!;
  const s = await CallSession.findOne({
    sessionId: req.params.sessionId,
    tenantId: tenant.id,
  }).lean<CallSessionDoc | null>();

  if (!s) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const isParty =
    s.clientDid === req.didPublicKeyB64 || s.providerDid === req.didPublicKeyB64;
  if (!isParty) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json(s);
});

const acceptBody = z.object({});

router.post("/:sessionId/accept", async (req, res) => {
  const tenant = req.tenant!;
  const s = await CallSession.findOne({
    sessionId: req.params.sessionId,
    tenantId: tenant.id,
  });

  if (!s) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (s.providerDid !== req.didPublicKeyB64) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (s.status !== "created") {
    res.status(400).json({ error: "invalid_state", status: s.status });
    return;
  }

  void acceptBody.parse(req.body);
  s.status = "accepted";
  await s.save();
  res.json({ ok: true, status: s.status });
});

router.post("/:sessionId/start", async (req, res) => {
  const tenant = req.tenant!;
  const s = await CallSession.findOne({
    sessionId: req.params.sessionId,
    tenantId: tenant.id,
  });

  if (!s) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const party =
    s.clientDid === req.didPublicKeyB64 || s.providerDid === req.didPublicKeyB64;
  if (!party) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (s.status !== "accepted" && s.status !== "created") {
    res.status(400).json({ error: "invalid_state", status: s.status });
    return;
  }

  s.status = "active";
  s.callStartedAt = new Date();
  await s.save();
  res.json({ ok: true, status: s.status, callStartedAt: s.callStartedAt });
});

const endBody = z.object({
  reportedDurationSec: z.number().int().nonnegative(),
});

router.post("/:sessionId/end", async (req, res) => {
  const tenant = req.tenant!;
  const parsed = endBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const s = await CallSession.findOne({
    sessionId: req.params.sessionId,
    tenantId: tenant.id,
  });

  if (!s) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const party =
    s.clientDid === req.didPublicKeyB64 || s.providerDid === req.didPublicKeyB64;
  if (!party) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (s.status !== "active") {
    res.status(400).json({ error: "invalid_state", status: s.status });
    return;
  }

  const end = new Date();
  const serverSec = s.callStartedAt
    ? Math.max(0, (end.getTime() - s.callStartedAt.getTime()) / 1000)
    : 0;
  const reported = parsed.data.reportedDurationSec;
  s.clientReportedDurationSec = reported;
  s.serverDurationSec = serverSec;
  s.callEndedAt = end;

  const delta = Math.abs(reported - serverSec);
  if (delta <= config.consensusWindowSec) {
    s.status = "settled";
  } else {
    s.status = "disputed";
  }

  await s.save();

  res.json({
    status: s.status,
    serverDurationSec: s.serverDurationSec,
    reportedDurationSec: reported,
    deltaSec: delta,
    settlementHint:
      s.status === "settled"
        ? {
            providerWei: null,
            platformWei: null,
            message:
              "On-chain settleCall(sessionId, duration) must be invoked by your custody flow or automation.",
          }
        : {
            message:
              "Duration outside consensus window — escrow held for parent-ecosystem arbitration.",
          },
  });
});

export default router;
