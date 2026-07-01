import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const PORT = Number(process.env.PORT || 4000);
const apiKey = process.env.CIRCLE_API_KEY?.trim();
const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
let walletSetId = process.env.CIRCLE_WALLET_SET_ID?.trim() || "";
const blockchain = process.env.CIRCLE_BLOCKCHAIN?.trim() || "MATIC";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

function circleClient() {
  if (!apiKey) {
    throw new Error("CIRCLE_API_KEY is not set in .env");
  }
  if (!entitySecret) {
    throw new Error(
      "CIRCLE_ENTITY_SECRET is not set. Generate one in Circle Console → W3S → Entity Secret, then add it to .env"
    );
  }
  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

async function ensureWalletSet(client) {
  if (walletSetId) return walletSetId;
  const response = await client.createWalletSet({ name: "Payphone" });
  const id = response.data?.walletSet?.id;
  if (!id) {
    throw new Error("Circle did not return a wallet set id");
  }
  walletSetId = id;
  console.log(`Created Circle wallet set: ${id}`);
  console.log(`Add to .env: CIRCLE_WALLET_SET_ID=${id}`);
  return id;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    circle_api_key: Boolean(apiKey),
    circle_entity_secret: Boolean(entitySecret),
    wallet_set_id: walletSetId || null,
    blockchain,
  });
});

app.post("/api/wallet/create", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }

    const chain = String(req.body?.blockchain || blockchain).trim();
    const client = circleClient();
    const setId = await ensureWalletSet(client);

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
      data: {
        wallet: {
          id: wallet.id,
          address: wallet.address,
        },
      },
    });
  } catch (err) {
    console.error("[wallet/create]", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Payphone API gateway listening on http://localhost:${PORT}`);
  console.log(`Circle configured: apiKey=${Boolean(apiKey)} entitySecret=${Boolean(entitySecret)}`);
});
