/**
 * Intent validation — mirrors Haskell intent-engine (V6 whitepaper).
 * Used by intent-shim and gateway tests.
 */

export const SERVICE_FEE_PERCENT = 0.005;

export const SUPPORTED_PAIRS = [
  ["BTC", "USDC"],
  ["BTC", "XLM"],
  ["ETH", "USDC"],
  ["ETH", "XLM"],
  ["MATIC", "USDC"],
  ["MATIC", "XLM"],
  ["USDC", "XLM"],
  ["USDC", "BTC"],
  ["XLM", "USDC"],
  ["WETH", "USDC"],
  ["WBTC", "USDC"],
  ["DAI", "USDC"],
];

const KNOWN_ASSETS = new Set([
  "BTC",
  "ETH",
  "MATIC",
  "USDC",
  "XLM",
  "WETH",
  "WBTC",
  "DAI",
]);

export function parseAsset(raw) {
  const s = String(raw || "")
    .trim()
    .toUpperCase();
  if (KNOWN_ASSETS.has(s)) return { asset: s, unknown: null };
  return { asset: null, unknown: s };
}

export function parseAmount(raw) {
  const n = Number(String(raw || "").trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseUrgency(raw) {
  const s = String(raw || "balanced").toLowerCase();
  if (s === "fast") return "Fast";
  if (s === "cheap") return "Cheap";
  return "Balanced";
}

export function parsePurpose(raw, recipient) {
  const p = String(raw || "general_swap").toLowerCase();
  if (p === "fund_wallet") return { type: "FundWallet" };
  if (p === "peer_payment") return { type: "PeerPayment", recipient: recipient || "" };
  if (p === "fund_escrow") return { type: "FundEscrow", contractId: recipient || "" };
  if (p === "pay_invoice") return { type: "PayInvoice", invoiceId: recipient || "" };
  return { type: "GeneralSwap" };
}

function pairSupported(assetIn, assetOut) {
  return SUPPORTED_PAIRS.some(([a, b]) => a === assetIn && b === assetOut);
}

export function validateRawIntent(raw, intentId, now = Date.now()) {
  const inParsed = parseAsset(raw.rawAssetIn);
  if (inParsed.unknown) {
    return { ok: false, error: { code: "UnknownAssetIn", message: inParsed.unknown } };
  }
  const outParsed = parseAsset(raw.rawAssetOut);
  if (outParsed.unknown) {
    return { ok: false, error: { code: "UnknownAssetOut", message: outParsed.unknown } };
  }

  const assetIn = inParsed.asset;
  const assetOut = outParsed.asset;

  if (assetIn === assetOut) {
    return { ok: false, error: { code: "SameAssetSwap", message: assetIn } };
  }
  if (!pairSupported(assetIn, assetOut)) {
    return { ok: false, error: { code: "UnsupportedAssetPair", assetIn, assetOut } };
  }

  const amountIn = parseAmount(raw.rawAmountIn);
  if (amountIn === null) {
    return { ok: false, error: { code: "InvalidAmount", message: raw.rawAmountIn } };
  }
  if (amountIn <= 0) {
    return { ok: false, error: { code: "ZeroAmount" } };
  }

  const purpose = parsePurpose(raw.rawPurpose, raw.rawRecipient);
  if (purpose.type === "PeerPayment" && !purpose.recipient) {
    return { ok: false, error: { code: "MissingRecipient", purpose: purpose.type } };
  }
  if (purpose.type === "FundEscrow" && !purpose.contractId) {
    return { ok: false, error: { code: "MissingRecipient", purpose: purpose.type } };
  }
  if (purpose.type === "PayInvoice" && !purpose.invoiceId) {
    return { ok: false, error: { code: "MissingRecipient", purpose: purpose.type } };
  }

  const urgency = parseUrgency(raw.rawUrgency);
  const estimatedFee = {
    serviceFeePercent: SERVICE_FEE_PERCENT * 100,
    networkFeePassthrough: "estimated from provider at route time",
    totalEstimatedFee: "calculated after route selection",
    feeNote:
      "All fees explicit. No hidden spread. Service fee 0.5% is Payphone revenue on orchestration.",
  };

  const canonical = {
    intentId,
    assetIn,
    amountIn,
    assetOut,
    recipient: raw.rawRecipient || null,
    purpose,
    urgency,
    submittedBy: String(raw.rawSubmittedBy || "").trim(),
    estimatedFee,
    submittedAt: now,
  };

  return { ok: true, canonical };
}

export function supportedPairsList() {
  return SUPPORTED_PAIRS.map(([assetIn, assetOut]) => ({ assetIn, assetOut }));
}
