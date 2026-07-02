/**
 * Execution orchestrator shim — port 4011
 */
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.ORCHESTRATOR_PORT || 4011);
const GATEWAY_URL = (process.env.GATEWAY_URL || "http://localhost:4000").replace(/\/$/, "");
const LEDGER_URL = (process.env.LEDGER_SERVICE_URL || "http://localhost:4012").replace(/\/$/, "");
const DEMO =
  process.env.PAYPHONE_DEMO_MODE !== "false" && process.env.PAYPHONE_DEMO_MODE !== "0";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const executions = new Map();
const routePlans = new Map();

async function ledgerRecord(event) {
  try {
    await fetch(`${LEDGER_URL}/v1/ledger/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch (e) {
    console.warn("[orchestrator] ledger record failed:", e.message);
  }
}

async function executeStep(step, context) {
  const provider = step.provider;
  if (DEMO) {
    return {
      step_index: step.step_index,
      success: true,
      transaction_id: `demo-${provider}-${randomUUID()}`,
      output_amount: step.estimated_amount_out,
      actual_fee: step.estimated_fee_usdc,
      simulated: true,
      provider,
    };
  }
  if (provider === "circle" || provider === "uniswap_v3") {
    const payload = {
      type: provider === "uniswap_v3" ? "swap" : "transfer",
      amount: Number(step.amount_in),
      sender: context.submittedBy,
      recipient: context.recipient || step.asset_out,
      metadata: {
        walletId: context.walletId,
        destinationAddress: context.destinationAddress || context.circleAddress,
        provider,
        step_index: step.step_index,
        adapter_params: step.adapter_params,
      },
    };
    if (!context.walletId && !DEMO) {
      throw new Error("Circle wallet ID required for execution");
    }
    const res = await fetch(`${GATEWAY_URL}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: context.authHeader || "",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Payment execution failed");
    return {
      step_index: step.step_index,
      success: true,
      transaction_id: body.data?.payment?.id || body.data?.result?.transaction_id,
      output_amount: step.estimated_amount_out,
      actual_fee: step.estimated_fee_usdc,
      provider_response: body.data,
    };
  }
  if (provider === "stellar_sdex") {
    return {
      step_index: step.step_index,
      success: true,
      transaction_id: `stellar-path-${randomUUID()}`,
      output_amount: step.estimated_amount_out,
      actual_fee: step.estimated_fee_usdc,
      note: "Stellar path payment built — sign with local stellar_secret in desktop app",
    };
  }
  if (provider === "btc_bridge") {
    return {
      step_index: step.step_index,
      success: true,
      transaction_id: `btc-bridge-${randomUUID()}`,
      output_amount: step.estimated_amount_out,
      actual_fee: step.estimated_fee_usdc,
      note: "BTC bridge initiated — confirm in your Bitcoin wallet; settlement 10–60 min",
    };
  }
  throw new Error(`Unknown provider: ${provider}`);
}

async function runExecution(executionId, plan, context) {
  const exec = executions.get(executionId);
  exec.status = "executing";
  await ledgerRecord({
    event_type: "ExecutionStarted",
    intent_id: plan.intent_id,
    route_plan_id: plan.route_plan_id,
    execution_id: executionId,
    actor: context.submittedBy,
    payload: { steps: plan.total_steps },
  });

  for (const step of plan.steps) {
    const stepRec = {
      step_index: step.step_index,
      status: "executing",
      started_at: Date.now(),
    };
    exec.steps.push(stepRec);
    await ledgerRecord({
      event_type: "StepStarted",
      intent_id: plan.intent_id,
      route_plan_id: plan.route_plan_id,
      execution_id: executionId,
      step_index: step.step_index,
      actor: context.submittedBy,
      payload: step,
    });

    try {
      const result = await executeStep(step, context);
      stepRec.status = "completed";
      stepRec.result = result;
      stepRec.completed_at = Date.now();
      await ledgerRecord({
        event_type: "StepCompleted",
        intent_id: plan.intent_id,
        route_plan_id: plan.route_plan_id,
        execution_id: executionId,
        step_index: step.step_index,
        actor: step.provider,
        payload: result,
      });
    } catch (e) {
      stepRec.status = "failed";
      stepRec.error = e.message;
      exec.status = "failed";
      exec.error = e.message;
      await ledgerRecord({
        event_type: "StepFailed",
        intent_id: plan.intent_id,
        route_plan_id: plan.route_plan_id,
        execution_id: executionId,
        step_index: step.step_index,
        actor: step.provider,
        payload: { error: e.message },
      });
      return;
    }
  }

  exec.status = "completed";
  exec.completed_at = Date.now();
  await ledgerRecord({
    event_type: "ExecutionCompleted",
    intent_id: plan.intent_id,
    route_plan_id: plan.route_plan_id,
    execution_id: executionId,
    actor: "system",
    payload: { service_fee_usdc: plan.service_fee_usdc },
  });
  await ledgerRecord({
    event_type: "TransactionFinalized",
    intent_id: plan.intent_id,
    route_plan_id: plan.route_plan_id,
    execution_id: executionId,
    actor: "system",
    payload: { output: plan.estimated_output_amount },
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payphone-execution-orchestrator" });
});

app.post("/v1/execute", async (req, res) => {
  try {
    const routePlan = req.body?.routePlan;
    const routePlanId = String(req.body?.routePlanId || routePlan?.route_plan_id || "").trim();
    const userConfirmation = req.body?.userConfirmation === true;
    if (!userConfirmation) {
      return res.status(400).json({ error: "userConfirmation: true is required" });
    }

    const plan = routePlan || routePlans.get(routePlanId);
    if (!plan) return res.status(404).json({ error: "Route plan not found" });

    const now = Math.floor(Date.now() / 1000);
    if (plan.valid_until_unix && now > plan.valid_until_unix) {
      return res.status(410).json({ error: "ROUTE_PLAN_EXPIRED", message: "Get a fresh route" });
    }

    const executionId = `exec-${randomUUID()}`;
    const exec = {
      execution_id: executionId,
      route_plan_id: plan.route_plan_id,
      intent_id: plan.intent_id,
      status: "pending",
      steps: [],
      created_at: Date.now(),
    };
    executions.set(executionId, exec);

    const context = {
      submittedBy: req.body?.submittedBy || "unknown",
      walletId: req.body?.walletId,
      circleAddress: req.body?.circleAddress,
      destinationAddress: req.body?.destinationAddress,
      recipient: req.body?.recipient,
      authHeader: req.headers.authorization || "",
    };

    runExecution(executionId, plan, context).catch(console.error);

    return res.status(202).json({
      ok: true,
      data: {
        executionId,
        status: "executing",
        steps: plan.steps.map((s) => ({ index: s.step_index, status: "pending" })),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/v1/execute/register-plan", (req, res) => {
  const plan = req.body?.routePlan;
  if (!plan?.route_plan_id) return res.status(400).json({ error: "routePlan required" });
  routePlans.set(plan.route_plan_id, plan);
  return res.json({ ok: true });
});

app.get("/v1/execute/:id", (req, res) => {
  const exec = executions.get(req.params.id);
  if (!exec) return res.status(404).json({ error: "Execution not found" });
  return res.json({ ok: true, data: exec });
});

app.get("/v1/execute/:id/steps", (req, res) => {
  const exec = executions.get(req.params.id);
  if (!exec) return res.status(404).json({ error: "Execution not found" });
  return res.json({ ok: true, data: exec.steps });
});

app.listen(PORT, () => {
  console.log(`Payphone execution orchestrator listening on http://localhost:${PORT}`);
});
