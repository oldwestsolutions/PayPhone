import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import {
  circleClient,
  circleConfig,
  circleReady,
  ensureWalletSet,
  formatBalances,
} from "./circle.js";
import { getRevenueSummary } from "./platform-fees.js";
import * as procurement from "./procurement.js";
import { connectMongo } from "./mongo.js";
import { registerUser, loginUser, authMiddleware, authConfigured } from "./auth.js";
import { executePaymentIntent, quotePaymentIntent, getPayment, listPaymentsForUser } from "./payment-service.js";
import { createBond, listBondsForUser, lockBond, returnBond, forfeitBond } from "./bonds.js";
import {
  createDispute,
  addClaim,
  fileAppeal,
  resolveDispute,
  listOpenDisputes,
  listDisputesForUser,
} from "./disputes.js";
import {
  btcpayConfigured,
  createStorageInvoice,
  handleBtcpayWebhook,
  verifyWebhookSignature,
  getUserStorageStatus,
  syncStorageFromInvoice,
  getInvoiceStatus,
} from "./btcpay.js";
import {
  legacyP2pTransfer,
  legacyEscrowSettle,
  legacyEscrowFund,
  legacyProcurementFund,
  legacyProcurementRelease,
  legacyPurchaseCredits,
} from "./legacy-payment.js";
import { registerOrchestrationRoutes } from "./orchestration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const PORT = Number(process.env.PORT || 4000);
const cfg = circleConfig();

const app = express();
app.use(cors({ origin: true }));

// BTCPay webhook — raw body required for HMAC verification
app.post("/api/webhooks/btcpay", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const raw = req.body;
    const sig = req.headers["btcpay-sig"] || req.headers["BTCPAY-SIG"];
    if (!verifyWebhookSignature(raw, sig)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    const payload = JSON.parse(raw.toString("utf8"));
    const result = await handleBtcpayWebhook(payload);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[btcpay/webhook]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    circle_ready: circleReady(),
    auth_configured: authConfigured(),
    circle_api_key: Boolean(cfg.apiKey),
    circle_entity_secret: Boolean(cfg.entitySecret),
    wallet_set_id: cfg.walletSetId || null,
    blockchain: cfg.blockchain,
    escrow_address: cfg.escrowAddress || null,
    escrow_wallet_id: cfg.escrowWalletId || null,
    platform_fee_address: cfg.platformFeeAddress || null,
    platform_fee_wallet_id: cfg.platformFeeWalletId || null,
    payment_layer: true,
    btcpay_configured: btcpayConfigured(),
    intent_engine: Boolean(process.env.INTENT_ENGINE_URL || true),
    routing_engine: Boolean(process.env.ROUTING_ENGINE_URL || true),
  });
});

// ─── Auth (Supabase) ───
app.post("/api/auth/register", async (req, res) => {
  try {
    const result = await registerUser(req.body || {});
    return res.status(201).json({ data: result });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const result = await loginUser(req.body || {});
    return res.json({ data: result });
  } catch (err) {
    return res.status(401).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/auth/me", authMiddleware(), (req, res) => {
  res.json({ data: { user: req.user } });
});

// ─── Payment Layer (single entry point) ───
app.post("/api/payments", authMiddleware(), async (req, res) => {
  try {
    const body = req.body || {};
    const intent = {
      ...body,
      sender: body.sender || req.user.username,
    };
    const { payment, result } = await executePaymentIntent(intent);
    return res.status(201).json({ data: { payment, result } });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/payments/quote", authMiddleware(), async (req, res) => {
  try {
    const quote = await quotePaymentIntent({ ...req.body, sender: req.user?.username });
    return res.json({ data: quote });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/payments/:id", authMiddleware(), async (req, res) => {
  const payment = await getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  return res.json({ data: payment });
});

app.get("/api/payments", authMiddleware(), async (req, res) => {
  const list = await listPaymentsForUser(req.user.username);
  return res.json({ data: list });
});

// ─── BTCPay storage billing (webhook activates on payment) ───
app.post("/api/billing/storage/invoice", authMiddleware(), async (req, res) => {
  try {
    const invoice = await createStorageInvoice(req.user.username);
    return res.status(201).json({ data: invoice });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/billing/storage/status", authMiddleware(), async (req, res) => {
  try {
    const status = await getUserStorageStatus(req.user.username);
    return res.json({ data: status });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/billing/storage/sync", authMiddleware(), async (req, res) => {
  try {
    const invoiceId = String(req.body?.invoiceId || req.user.storage_invoice_id || "").trim();
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });

    const invoice = await getInvoiceStatus(invoiceId);
    const user = await syncStorageFromInvoice(invoice);
    if (!user) {
      return res.status(402).json({
        error: "Payment not detected yet. Complete checkout in BTCPay.",
        status: invoice.status,
      });
    }
    return res.json({ data: { user, activated: true } });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── Bonds ───
app.post("/api/bonds", authMiddleware(), async (req, res) => {
  try {
    const bond = await createBond({
      posterId: req.user.username,
      counterpartyId: req.body.counterpartyId,
      escrowContractId: req.body.escrowContractId,
      amount: req.body.amount,
      posterWalletId: req.user.circle_wallet_id,
    });
    return res.status(201).json({ data: bond });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/bonds", authMiddleware(), async (req, res) => {
  const bonds = await listBondsForUser(req.user.username);
  return res.json({ data: bonds });
});

app.post("/api/bonds/:id/lock", authMiddleware(), async (req, res) => {
  try {
    return res.json({ data: await lockBond(req.params.id) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/bonds/:id/return", authMiddleware(), async (req, res) => {
  try {
    return res.json({ data: await returnBond(req.params.id) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── Disputes & claims (Fiverr-style) ───
app.post("/api/disputes", authMiddleware(), async (req, res) => {
  try {
    const d = await createDispute({
      contractId: req.body.contractId,
      disputingParty: req.user.username,
      reason: req.body.reason,
      contractType: req.body.contractType,
    });
    return res.status(201).json({ data: d });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.get("/api/disputes", authMiddleware(), async (req, res) => {
  const list =
    req.user.role === "admin"
      ? await listOpenDisputes()
      : await listDisputesForUser(req.user.username);
  return res.json({ data: list });
});

app.post("/api/disputes/:id/claims", authMiddleware(), async (req, res) => {
  try {
    const claim = await addClaim({
      disputeId: req.params.id,
      claimantId: req.user.username,
      body: req.body.body,
      evidenceTokens: req.body.evidenceTokens,
    });
    return res.status(201).json({ data: claim });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/disputes/:id/appeal", authMiddleware(), async (req, res) => {
  try {
    const result = await fileAppeal({
      disputeId: req.params.id,
      appellantId: req.user.username,
      walletId: req.user.circle_wallet_id,
      destinationAddress: req.body.destinationAddress,
    });
    return res.status(201).json({ data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/admin/disputes/:id/resolve", authMiddleware("admin"), async (req, res) => {
  try {
    const outcome = await resolveDispute({
      disputeId: req.params.id,
      resolution: req.body.resolution,
      winnerId: req.body.winnerId,
      adminId: req.user.username,
      splitPct: req.body.splitPct,
    });
    if (req.body.forfeitBondId && req.body.beneficiaryId) {
      await forfeitBond(req.body.forfeitBondId, req.body.beneficiaryId);
    }
    return res.json({ data: outcome });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/wallet/create", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    if (!username) return res.status(400).json({ error: "username is required" });

    const client = circleClient();
    const setId = await ensureWalletSet(client);
    const chain = String(req.body?.blockchain || cfg.blockchain).trim();

    const response = await client.createWallets({
      idempotencyKey: randomUUID(),
      walletSetId: setId,
      blockchains: [chain],
      count: 1,
      accountType: "EOA",
      metadata: [{ name: `Payphone ${username}`, refId: username }],
    });

    const wallet = response.data?.wallets?.[0];
    if (!wallet?.id || !wallet?.address) {
      return res.status(502).json({ error: "Circle returned no wallet" });
    }

    return res.status(201).json({
      data: { wallet: { id: wallet.id, address: wallet.address, blockchain: chain } },
    });
  } catch (err) {
    console.error("[wallet/create]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/wallet/:walletId", async (req, res) => {
  try {
    const client = circleClient();
    const response = await client.getWallet({ id: req.params.walletId });
    const wallet = response.data?.wallet;
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    return res.json({ data: { wallet } });
  } catch (err) {
    console.error("[wallet/get]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/wallet/:walletId/balances", async (req, res) => {
  try {
    const client = circleClient();
    const response = await client.getWalletTokenBalance({ id: req.params.walletId });
    const balances = formatBalances(response.data?.tokenBalances);
    const usdc = balances.find((b) => b.symbol === "USDC") ?? balances[0] ?? null;
    return res.json({ data: { balances, usdc_balance: usdc?.amount ?? "0", usdc_token_id: usdc?.token_id } });
  } catch (err) {
    console.error("[wallet/balances]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/transfer", async (req, res) => {
  try {
    const data = await legacyP2pTransfer(req.body || {});
    return res.status(201).json({ data });
  } catch (err) {
    console.error("[transfer]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/escrow/settle", async (req, res) => {
  try {
    const data = await legacyEscrowSettle(req.body || {});
    return res.status(201).json({ data });
  } catch (err) {
    console.error("[escrow/settle]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/platform/revenue", (_req, res) => {
  return res.json({ data: getRevenueSummary() });
});

app.get("/api/platform/wallet", async (_req, res) => {
  try {
    const walletId = cfg.platformFeeWalletId;
    if (!walletId || !circleReady()) {
      const summary = getRevenueSummary();
      return res.json({
        data: {
          simulated: true,
          wallet_id: walletId || null,
          address: cfg.platformFeeAddress || null,
          usdc_balance: summary.all_time_total_usdc.toFixed(2),
          note: "Demo ledger total — configure PAYPHONE_PLATFORM_FEE_WALLET_ID for live Circle balance",
        },
      });
    }
    const client = circleClient();
    const response = await client.getWalletTokenBalance({ id: walletId });
    const balances = formatBalances(response.data?.tokenBalances);
    const usdc = balances.find((b) => b.symbol === "USDC") ?? balances[0] ?? null;
    return res.json({
      data: {
        simulated: false,
        wallet_id: walletId,
        address: cfg.platformFeeAddress,
        usdc_balance: usdc?.amount ?? "0",
        balances,
      },
    });
  } catch (err) {
    console.error("[platform/wallet]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/procurement/commitments", async (req, res) => {
  try {
    const commitment = procurement.createCommitment(req.body || {});
    return res.status(201).json({ data: commitment });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/procurement/commitments", async (req, res) => {
  try {
    const party = String(req.query.party || "").trim();
    return res.json({ data: procurement.listCommitments(party || undefined) });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/procurement/commitments/:id", async (req, res) => {
  try {
    return res.json({ data: procurement.getCommitment(req.params.id) });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/procurement/commitments/:id/fund", async (req, res) => {
  try {
    const data = await legacyProcurementFund(req.params.id, req.body || {});
    return res.status(201).json({ data });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/procurement/commitments/:id/transition", async (req, res) => {
  try {
    const updated = procurement.transitionCommitment(req.params.id, req.body || {});
    return res.json({ data: updated });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/procurement/commitments/:id/release-milestone", async (req, res) => {
  try {
    const data = await legacyProcurementRelease(req.params.id, req.body || {});
    return res.json({ data });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/procurement/commitments/:id/audit", async (req, res) => {
  try {
    return res.json({ data: procurement.getAudit(req.params.id) });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/escrow/fund", async (req, res) => {
  try {
    const data = await legacyEscrowFund(req.body || {});
    return res.status(201).json({ data });
  } catch (err) {
    console.error("[escrow/fund]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/pay/purchase-credits", async (req, res) => {
  try {
    const data = await legacyPurchaseCredits(req.body || {});
    return res.status(201).json({ data });
  } catch (err) {
    console.error("[pay/purchase-credits]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/pay/quote", async (req, res) => {
  const storageGib = Number(req.body?.storageGibMonths || 0);
  const transferMib = Number(req.body?.transferMib || 0);
  const reason = String(req.body?.reason || "storage");
  const totalUsdc = storageGib * 0.5 + transferMib * 0.02;
  return res.json({
    data: {
      storageGibMonths: storageGib,
      transferMib,
      totalUsdc,
      filecoinRate: 0.5,
      transferRate: 0.02,
      reason,
      solidityContract: "PayPhoneCredits",
    },
  });
});

app.get("/api/transaction/:txId", async (req, res) => {
  try {
    const client = circleClient();
    const response = await client.getTransaction({ id: req.params.txId });
    const tx = response.data?.transaction;
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    return res.json({ data: { transaction: tx } });
  } catch (err) {
    console.error("[transaction/get]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

registerOrchestrationRoutes(app, authMiddleware);

app.listen(PORT, async () => {
  try {
    await connectMongo();
  } catch (e) {
    console.warn("[mongo] connection failed — auth/payments require MongoDB:", e.message);
  }
  console.log(`Payphone API gateway listening on http://localhost:${PORT}`);
  console.log(
    `Circle: apiKey=${Boolean(cfg.apiKey)} entitySecret=${Boolean(cfg.entitySecret)} ready=${circleReady()} auth=${authConfigured()}`
  );
});
