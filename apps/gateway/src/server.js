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
  createUsdcTransfer,
  ensureWalletSet,
  formatBalances,
} from "./circle.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const PORT = Number(process.env.PORT || 4000);
const cfg = circleConfig();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    circle_ready: circleReady(),
    circle_api_key: Boolean(cfg.apiKey),
    circle_entity_secret: Boolean(cfg.entitySecret),
    wallet_set_id: cfg.walletSetId || null,
    blockchain: cfg.blockchain,
    escrow_address: cfg.escrowAddress || null,
  });
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
    const walletId = String(req.body?.walletId || "").trim();
    const destinationAddress = String(req.body?.destinationAddress || "").trim();
    const amount = String(req.body?.amount || "").trim();
    const refId = String(req.body?.refId || "").trim() || undefined;

    if (!walletId || !destinationAddress || !amount) {
      return res.status(400).json({ error: "walletId, destinationAddress, and amount are required" });
    }

    const client = circleClient();
    const tx = await createUsdcTransfer(client, { walletId, destinationAddress, amount, refId });
    return res.status(201).json({ data: { transaction: tx } });
  } catch (err) {
    console.error("[transfer]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/escrow/fund", async (req, res) => {
  try {
    const walletId = String(req.body?.walletId || "").trim();
    const amount = String(req.body?.amount || "").trim();
    const contractId = String(req.body?.contractId || "").trim();

    if (!walletId || !amount || !contractId) {
      return res.status(400).json({ error: "walletId, amount, and contractId are required" });
    }
    if (!cfg.escrowAddress) {
      return res.status(503).json({
        error: "PAYPHONE_ESCROW_WALLET_ADDRESS is not configured in .env",
      });
    }

    const client = circleClient();
    const tx = await createUsdcTransfer(client, {
      walletId,
      destinationAddress: cfg.escrowAddress,
      amount,
      refId: `escrow-${contractId}`,
    });
    return res.status(201).json({ data: { transaction: tx, escrow_address: cfg.escrowAddress } });
  } catch (err) {
    console.error("[escrow/fund]", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
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

app.listen(PORT, () => {
  console.log(`Payphone API gateway listening on http://localhost:${PORT}`);
  console.log(
    `Circle: apiKey=${Boolean(cfg.apiKey)} entitySecret=${Boolean(cfg.entitySecret)} ready=${circleReady()}`
  );
});
