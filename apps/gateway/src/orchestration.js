/**
 * Gateway orchestration routes — intent, routing, execution, ledger (V6).
 */
import { getDb } from "./mongo.js";

const INTENT_URL = () =>
  (process.env.INTENT_ENGINE_URL || "http://localhost:4008").replace(/\/$/, "");
const ROUTING_URL = () =>
  (process.env.ROUTING_ENGINE_URL || "http://localhost:4009").replace(/\/$/, "");
const ORCHESTRATOR_URL = () =>
  (process.env.EXECUTION_ORCHESTRATOR_URL || "http://localhost:4011").replace(/\/$/, "");
const LEDGER_URL = () =>
  (process.env.LEDGER_SERVICE_URL || "http://localhost:4012").replace(/\/$/, "");

async function ledgerRecord(event) {
  try {
    await fetch(`${LEDGER_URL()}/v1/ledger/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch (e) {
    console.warn("[orchestration] ledger:", e.message);
  }
}

export function registerOrchestrationRoutes(app, authMiddleware) {
  // ─── Intent ───
  app.post("/api/intent/submit", authMiddleware(), async (req, res) => {
    try {
      const raw = {
        ...req.body,
        rawSubmittedBy: req.body?.rawSubmittedBy || req.user.username,
      };
      const resp = await fetch(`${INTENT_URL()}/v1/intent/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      });
      const body = await resp.json();
      if (!resp.ok) return res.status(400).json({ ok: false, error: body.error });

      const canonical = body.data;
      await getDb().collection("intents").updateOne(
        { intent_id: canonical.intentId },
        {
          $set: {
            intent_id: canonical.intentId,
            raw_intent: raw,
            canonical_intent: canonical,
            status: "validated",
            submitted_by: req.user.username,
            updated_at: Date.now(),
          },
          $setOnInsert: { created_at: Date.now() },
        },
        { upsert: true }
      );

      await ledgerRecord({
        event_type: "IntentSubmitted",
        intent_id: canonical.intentId,
        actor: req.user.username,
        payload: raw,
      });
      await ledgerRecord({
        event_type: "IntentValidated",
        intent_id: canonical.intentId,
        actor: "intent-engine",
        payload: canonical,
      });

      return res.status(201).json({ ok: true, data: canonical });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/intent/validate", authMiddleware(), async (req, res) => {
    const resp = await fetch(`${INTENT_URL()}/v1/intent/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return res.json(await resp.json());
  });

  app.get("/api/intent/supported-pairs", async (_req, res) => {
    const resp = await fetch(`${INTENT_URL()}/v1/intent/supported-pairs`);
    const body = await resp.json();
    return res.json(body);
  });

  app.get("/api/intent/:id", authMiddleware(), async (req, res) => {
    const doc = await getDb().collection("intents").findOne({ intent_id: req.params.id });
    if (!doc) return res.status(404).json({ error: "Intent not found" });
    return res.json({ ok: true, data: { ...doc.canonical_intent, status: doc.status } });
  });

  // ─── Routing ───
  app.post("/api/routes/evaluate", authMiddleware(), async (req, res) => {
    try {
      const intentId = String(req.body?.intentId || "").trim();
      if (!intentId) return res.status(400).json({ error: "intentId is required" });

      const resp = await fetch(`${ROUTING_URL()}/v1/routes/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId }),
      });
      const body = await resp.json();
      if (!resp.ok) return res.status(400).json({ error: body.error });

      const plan = body.data;
      await getDb().collection("route_plans").updateOne(
        { route_plan_id: plan.route_plan_id },
        { $set: { ...plan, user_confirmed: false, created_at: Date.now() } },
        { upsert: true }
      );
      await getDb()
        .collection("intents")
        .updateOne(
          { intent_id: intentId },
          { $set: { status: "routing", route_plan_id: plan.route_plan_id, updated_at: Date.now() } }
        );

      await ledgerRecord({
        event_type: "RoutePlanSelected",
        intent_id: intentId,
        route_plan_id: plan.route_plan_id,
        actor: "routing-engine",
        payload: plan,
      });

      return res.status(201).json({ ok: true, data: plan });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/routes/:routePlanId", authMiddleware(), async (req, res) => {
    const plan = await getDb()
      .collection("route_plans")
      .findOne({ route_plan_id: req.params.routePlanId });
    if (!plan) return res.status(404).json({ error: "Route plan not found" });
    return res.json({ ok: true, data: plan });
  });

  app.post("/api/routes/quote", authMiddleware(), async (req, res) => {
    const resp = await fetch(`${ROUTING_URL()}/v1/routes/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const body = await resp.json();
    if (!resp.ok) return res.status(400).json(body);
    return res.json(body);
  });

  app.get("/api/routes/providers/status", async (_req, res) => {
    const resp = await fetch(`${ROUTING_URL()}/v1/routes/providers/status`);
    return res.json(await resp.json());
  });

  // ─── Execution ───
  app.post("/api/execute", authMiddleware(), async (req, res) => {
    try {
      const routePlanId = String(req.body?.routePlanId || "").trim();
      if (!routePlanId) return res.status(400).json({ error: "routePlanId is required" });
      if (req.body?.userConfirmation !== true) {
        return res.status(400).json({ error: "userConfirmation: true is required" });
      }

      const plan = await getDb().collection("route_plans").findOne({ route_plan_id: routePlanId });
      if (!plan) return res.status(404).json({ error: "Route plan not found" });

      const now = Math.floor(Date.now() / 1000);
      if (plan.valid_until_unix && now > plan.valid_until_unix) {
        return res.status(410).json({ error: "ROUTE_PLAN_EXPIRED" });
      }

      await fetch(`${ORCHESTRATOR_URL()}/v1/execute/register-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routePlan: plan }),
      });

      const authHeader = req.headers.authorization || "";
      const resp = await fetch(`${ORCHESTRATOR_URL()}/v1/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          routePlanId,
          routePlan: plan,
          userConfirmation: true,
          submittedBy: req.user.username,
          walletId: req.user.circle_wallet_id,
          circleAddress: req.user.circle_wallet_address,
          recipient: plan.steps?.[plan.steps.length - 1]?.asset_out,
        }),
      });
      const body = await resp.json();
      if (!resp.ok) return res.status(resp.status).json(body);

      await getDb().collection("route_plans").updateOne(
        { route_plan_id: routePlanId },
        { $set: { user_confirmed: true, user_confirmed_at: Date.now() } }
      );
      await getDb().collection("intents").updateOne(
        { intent_id: plan.intent_id },
        {
          $set: {
            status: "executing",
            execution_id: body.data?.executionId,
            updated_at: Date.now(),
          },
        }
      );

      await ledgerRecord({
        event_type: "UserConfirmedExecution",
        intent_id: plan.intent_id,
        route_plan_id: routePlanId,
        actor: req.user.username,
        payload: { executionId: body.data?.executionId },
      });

      return res.status(202).json(body);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/execute/:executionId", authMiddleware(), async (req, res) => {
    const resp = await fetch(`${ORCHESTRATOR_URL()}/v1/execute/${req.params.executionId}`);
    const body = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(body);
    return res.json(body);
  });

  app.get("/api/execute/:executionId/steps", authMiddleware(), async (req, res) => {
    const resp = await fetch(`${ORCHESTRATOR_URL()}/v1/execute/${req.params.executionId}/steps`);
    const body = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(body);
    return res.json(body);
  });

  app.get("/api/ledger/intent/:intentId", authMiddleware(), async (req, res) => {
    const resp = await fetch(`${LEDGER_URL()}/v1/ledger/intent/${req.params.intentId}`);
    const body = await resp.json();
    return res.json(body);
  });

  app.get("/api/ledger/verify/:intentId", authMiddleware(), async (req, res) => {
    const resp = await fetch(`${LEDGER_URL()}/v1/ledger/verify/${req.params.intentId}`);
    const body = await resp.json();
    return res.json(body);
  });

  app.get("/api/ledger/recent", authMiddleware("admin"), async (req, res) => {
    const resp = await fetch(`${LEDGER_URL()}/v1/ledger/recent`);
    const body = await resp.json();
    return res.json(body);
  });
}
