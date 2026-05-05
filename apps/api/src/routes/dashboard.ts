import express from "express";
import { z } from "zod";
import { Provider } from "../models/provider.js";
import { CallSession } from "../models/session.js";
import { fetchReputation, meetsMinimum } from "../services/reputation.js";
import { nanoid } from "nanoid";

const router = express.Router();

const upsertBody = z.object({
  displayName: z.string().min(1),
  bio: z.string().optional(),
  ratePerSecond: z.string().regex(/^\d+$/),
  maxDurationSec: z.number().int().positive(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  availabilityOnline: z.boolean().optional(),
});

/** Upsert marketplace row for authenticated DID */
router.put("/profile", async (req, res) => {
  const tenant = req.tenant!;
  const did = req.didPublicKeyB64!;
  const parsed = upsertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const rep = await fetchReputation(tenant, did);
  if (!meetsMinimum(rep, tenant)) {
    res.status(403).json({ error: "reputation_gate" });
    return;
  }

  const existing = await Provider.findOne({ tenantId: tenant.id, did });
  const providerId = existing?.providerId ?? `p_${nanoid(12)}`;

  await Provider.findOneAndUpdate(
    { tenantId: tenant.id, did },
    {
      $set: {
        providerId,
        displayName: parsed.data.displayName,
        bio: parsed.data.bio ?? "",
        ratePerSecond: parsed.data.ratePerSecond,
        maxDurationSec: parsed.data.maxDurationSec,
        walletAddress: parsed.data.walletAddress,
        availabilityOnline: parsed.data.availabilityOnline ?? false,
      },
    },
    { upsert: true, new: true }
  );

  res.json({ ok: true, providerId });
});

router.get("/earnings", async (req, res) => {
  const tenant = req.tenant!;
  const did = req.didPublicKeyB64!;

  const rows = await CallSession.find({
    tenantId: tenant.id,
    providerDid: did,
    status: { $in: ["settled", "ended", "disputed", "active"] },
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const summary = rows.reduce(
    (acc, s) => {
      acc.calls += 1;
      if (s.status === "settled") acc.settled += 1;
      if (s.status === "disputed") acc.disputed += 1;
      return acc;
    },
    { calls: 0, settled: 0, disputed: 0 }
  );

  res.json({
    summary,
    calls: rows.map((s) => ({
      sessionId: s.sessionId,
      status: s.status,
      ratePerSecond: s.ratePerSecond,
      serverDurationSec: s.serverDurationSec,
      clientReportedDurationSec: s.clientReportedDurationSec,
      updatedAt: s.updatedAt,
    })),
  });
});

router.get("/profile", async (req, res) => {
  const tenant = req.tenant!;
  const did = req.didPublicKeyB64!;
  const p = await Provider.findOne({ tenantId: tenant.id, did }).lean();
  if (!p) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const rep = await fetchReputation(tenant, did);
  res.json({ ...p, reputation: rep });
});

export default router;
