import type { RequestHandler } from "express";
import { getTenant } from "../config.js";

/**
 * Resolves ecosystem tenant from `X-Tenant-Id` (preferred) or `?tenant=` for WebSocket upgrades.
 */
export const tenantMiddleware: RequestHandler = (req, res, next) => {
  const header = req.header("x-tenant-id");
  const q = typeof req.query.tenant === "string" ? req.query.tenant : undefined;
  const id = (header ?? q ?? "default").toLowerCase();
  const tenant = getTenant(id);
  if (!tenant) {
    res.status(400).json({ error: "unknown_tenant", tenantId: id });
    return;
  }
  req.tenant = tenant;
  next();
};
