/**
 * Routing path evaluation — V6 whitepaper logic (Node shim; Rust service uses same rules).
 */
import { randomUUID } from "node:crypto";

const SERVICE_FEE_PERCENT = 0.005;
const QUOTE_VALIDITY_SEC = Number(process.env.ROUTE_QUOTE_VALIDITY_SECONDS || 30);

/** Configurable spot rates (set POLYGON_MATIC_USDC_RATE etc. in .env for live tuning) */
function spotRate(assetIn, assetOut) {
  const key = `${assetIn}_${assetOut}`;
  const envKey = `RATE_${assetIn}_${assetOut}`;
  if (process.env[envKey]) return Number(process.env[envKey]);
  const defaults = {
    MATIC_USDC: Number(process.env.POLYGON_MATIC_USDC_RATE || "0.22"),
    ETH_USDC: Number(process.env.ETH_USDC_RATE || "3200"),
    BTC_USDC: Number(process.env.BTC_USDC_RATE || "65000"),
    USDC_XLM: Number(process.env.USDC_XLM_RATE || "8.5"),
    WETH_USDC: Number(process.env.ETH_USDC_RATE || "3200"),
    WBTC_USDC: Number(process.env.BTC_USDC_RATE || "65000"),
    DAI_USDC: 1.0,
  };
  return defaults[key] ?? 1.0;
}

function selectProvider(assetIn, assetOut) {
  if (assetIn === "MATIC" && assetOut === "USDC") return "uniswap_v3";
  if (assetIn === "ETH" && assetOut === "USDC") return "uniswap_v3";
  if (assetIn === "WETH" && assetOut === "USDC") return "uniswap_v3";
  if (assetIn === "WBTC" && assetOut === "USDC") return "uniswap_v3";
  if (assetIn === "DAI" && assetOut === "USDC") return "uniswap_v3";
  if ((assetIn === "USDC" && assetOut === "XLM") || (assetIn === "XLM" && assetOut === "USDC")) {
    return "stellar_sdex";
  }
  if (assetIn === "BTC") return "btc_bridge";
  if (assetIn === "USDC" || assetOut === "USDC") return "circle";
  return "circle";
}

function stepType(assetIn, assetOut, provider) {
  if (provider === "btc_bridge") return "Bridge";
  if (provider === "uniswap_v3") return "Swap";
  if (provider === "stellar_sdex") return "Swap";
  if (provider === "circle") return "Transfer";
  return "Transfer";
}

function networkForProvider(provider) {
  if (provider === "uniswap_v3") return "polygon";
  if (provider === "stellar_sdex") return "stellar";
  if (provider === "btc_bridge") return "bitcoin";
  return "circle";
}

function poolFeePct(provider) {
  if (provider === "uniswap_v3") return 0.003;
  if (provider === "stellar_sdex") return 0.0001;
  if (provider === "btc_bridge") return 0.008;
  return 0;
}

function latencyMs(provider) {
  if (provider === "btc_bridge") return 600_000;
  if (provider === "uniswap_v3") return 3000;
  if (provider === "stellar_sdex") return 5000;
  return 3000;
}

export function generateCandidatePaths(assetIn, assetOut) {
  const pair = `${assetIn}->${assetOut}`;
  const paths = {
    "BTC->USDC": [["BTC", "USDC"], ["BTC", "WBTC", "USDC"]],
    "BTC->XLM": [["BTC", "USDC", "XLM"]],
    "MATIC->USDC": [["MATIC", "USDC"]],
    "ETH->USDC": [["ETH", "USDC"], ["ETH", "WETH", "USDC"]],
    "USDC->XLM": [["USDC", "XLM"]],
    "XLM->USDC": [["XLM", "USDC"]],
    "DAI->USDC": [["DAI", "USDC"]],
    "WETH->USDC": [["WETH", "USDC"]],
    "WBTC->USDC": [["WBTC", "USDC"]],
  };
  return paths[pair] || [[assetIn, assetOut]];
}

function quoteHop(assetIn, assetOut, amountIn) {
  const provider = selectProvider(assetIn, assetOut);
  const rate = spotRate(assetIn, assetOut);
  const poolFee = poolFeePct(provider);
  const gross = amountIn * rate;
  const amountOut = gross * (1 - poolFee);
  const feeUsdc = gross * poolFee;
  return {
    step_type: stepType(assetIn, assetOut, provider),
    asset_in: assetIn,
    asset_out: assetOut,
    amount_in: String(amountIn),
    estimated_amount_out: amountOut.toFixed(6),
    provider,
    network: networkForProvider(provider),
    estimated_fee_usdc: feeUsdc.toFixed(4),
    estimated_latency_ms: latencyMs(provider),
    adapter_params: { rate, pool_fee_pct: poolFee },
  };
}

export function quotePath(path, amountIn) {
  const steps = [];
  let currentAmount = amountIn;
  let currentAsset = path[0];
  for (let i = 1; i < path.length; i++) {
    const nextAsset = path[i];
    const hop = quoteHop(currentAsset, nextAsset, currentAmount);
    hop.step_index = i - 1;
    steps.push(hop);
    currentAmount = Number(hop.estimated_amount_out);
    currentAsset = nextAsset;
  }
  return steps;
}

function urgencyToStrategy(urgency) {
  if (urgency === "Fast") return "MinimizeLatency";
  if (urgency === "Cheap") return "MinimizeFees";
  return "Balanced";
}

function scoreRoute(steps, strategy) {
  const totalFee = steps.reduce((s, x) => s + Number(x.estimated_fee_usdc || 0), 0);
  const totalLatency = steps.reduce((s, x) => s + (x.estimated_latency_ms || 0), 0);
  const stepPenalty = steps.length * 0.1;
  if (strategy === "MinimizeFees") return 100 - totalFee - stepPenalty;
  if (strategy === "MinimizeLatency") return 100 - totalLatency / 1000 - stepPenalty;
  return 100 - totalFee * 0.5 - totalLatency / 2000 - stepPenalty;
}

export function buildRoutePlan(intent, candidatePaths) {
  const strategy = urgencyToStrategy(intent.urgency);
  const quoted = candidatePaths
    .map((path) => ({ path, steps: quotePath(path, intent.amountIn) }))
    .filter((r) => r.steps.length > 0);

  if (quoted.length === 0) {
    throw new Error("No viable routes for this asset pair");
  }

  const scored = quoted
    .map((r) => ({ score: scoreRoute(r.steps, strategy), ...r }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1).map((alt) => ({
    description: alt.path.join(" → "),
    estimated_output: alt.steps[alt.steps.length - 1].estimated_amount_out,
    total_fee_usdc: alt.steps
      .reduce((s, x) => s + Number(x.estimated_fee_usdc), 0)
      .toFixed(4),
    estimated_latency_ms: alt.steps.reduce((s, x) => s + x.estimated_latency_ms, 0),
    reason_not_selected: `Lower score (${alt.score.toFixed(2)} vs ${best.score.toFixed(2)})`,
  }));

  const networkFee = best.steps.reduce((s, x) => s + Number(x.estimated_fee_usdc), 0);
  const outputBeforeService = Number(best.steps[best.steps.length - 1].estimated_amount_out);
  const serviceFee =
    intent.assetOut === "USDC" || intent.assetOut === "XLM"
      ? outputBeforeService * SERVICE_FEE_PERCENT
      : outputBeforeService * SERVICE_FEE_PERCENT;
  const now = Math.floor(Date.now() / 1000);

  return {
    route_plan_id: `route-${randomUUID()}`,
    intent_id: intent.intentId,
    steps: best.steps,
    total_steps: best.steps.length,
    estimated_output_amount: (outputBeforeService - serviceFee).toFixed(6),
    estimated_output_asset: intent.assetOut,
    service_fee_usdc: serviceFee.toFixed(4),
    network_fee_usdc: networkFee.toFixed(4),
    total_fee_usdc: (serviceFee + networkFee).toFixed(4),
    estimated_total_latency_ms: best.steps.reduce((s, x) => s + x.estimated_latency_ms, 0),
    optimization_strategy: strategy,
    selected_reason: `Best ${strategy} path: ${best.path.join(" → ")}`,
    alternative_routes: alternatives,
    valid_until_unix: now + QUOTE_VALIDITY_SEC,
    fee_note:
      "All fees shown above. No hidden spread. No markup on network fees. Service fee of 0.5% is Payphone's only revenue on this transaction.",
    created_at: Date.now(),
  };
}

export function evaluateIntent(intent) {
  const paths = generateCandidatePaths(intent.assetIn, intent.assetOut);
  return buildRoutePlan(intent, paths);
}

export function quickQuote(assetIn, assetOut, amount) {
  const amt = Number(amount);
  const steps = quotePath([assetIn, assetOut], amt);
  const last = steps[steps.length - 1];
  return {
    estimatedOut: last.estimated_amount_out,
    fees: steps.reduce((s, x) => s + Number(x.estimated_fee_usdc), 0).toFixed(4),
    providers: steps.map((s) => s.provider),
    latencyMs: steps.reduce((s, x) => s + x.estimated_latency_ms, 0),
  };
}
