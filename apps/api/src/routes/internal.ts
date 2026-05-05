import express from "express";
import type { ReputationView } from "../services/reputation.js";

const router = express.Router();

/** Development helper when `TENANTS_JSON` is empty — simulates parent ecosystem reader */
router.get("/mock-reputation", (req, res) => {
  const did = String(req.query.did ?? "");
  const hash = Array.from(did).reduce((a, c) => a + c.charCodeAt(0), 0) % 40;
  const view: ReputationView = {
    score: 70 + (hash % 25),
    reviewCount: 12 + (hash % 80),
    verificationStatus: hash % 3 === 0 ? "verified" : "pending",
  };
  res.json(view);
});

export default router;
