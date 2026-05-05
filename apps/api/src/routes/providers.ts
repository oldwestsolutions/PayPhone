import express from "express";
import { fetchReputation, meetsMinimum } from "../services/reputation.js";
import { Provider } from "../models/provider.js";
import type { ProviderDoc } from "../models/provider.js";

const router = express.Router();

/** List providers visible to caller — reputation gated by tenant minimum */
router.get("/", async (req, res) => {
  const tenant = req.tenant!;
  const providers = await Provider.find({ tenantId: tenant.id }).lean<ProviderDoc[]>();

  const enriched = await Promise.all(
    providers.map(async (p) => {
      const rep = await fetchReputation(tenant, p.did);
      const visible = meetsMinimum(rep, tenant);
      return {
        providerId: p.providerId,
        displayName: p.displayName,
        bio: p.bio,
        ratePerSecond: p.ratePerSecond,
        maxDurationSec: p.maxDurationSec,
        availabilityOnline: p.availabilityOnline,
        reputation: rep,
        visible,
        walletAddress: undefined as string | undefined,
        did: undefined as string | undefined,
      };
    })
  );

  res.json({
    providers: enriched.filter((x) => x.visible),
  });
});

router.get("/:providerId", async (req, res) => {
  const tenant = req.tenant!;
  const p = await Provider.findOne({
    tenantId: tenant.id,
    providerId: req.params.providerId,
  }).lean<ProviderDoc | null>();

  if (!p) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const rep = await fetchReputation(tenant, p.did);
  if (!meetsMinimum(rep, tenant)) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json({
    providerId: p.providerId,
    displayName: p.displayName,
    bio: p.bio,
    ratePerSecond: p.ratePerSecond,
    maxDurationSec: p.maxDurationSec,
    availabilityOnline: p.availabilityOnline,
    reputation: rep,
  });
});

export default router;
