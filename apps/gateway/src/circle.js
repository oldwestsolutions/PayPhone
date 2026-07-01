import { randomUUID } from "node:crypto";
import {
  generateEntitySecret,
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

export function circleConfig() {
  return {
    apiKey: process.env.CIRCLE_API_KEY?.trim() || "",
    entitySecret: process.env.CIRCLE_ENTITY_SECRET?.trim() || "",
    walletSetId: process.env.CIRCLE_WALLET_SET_ID?.trim() || "",
    blockchain: process.env.CIRCLE_BLOCKCHAIN?.trim() || "MATIC",
    usdcTokenAddress:
      process.env.CIRCLE_USDC_TOKEN_ADDRESS?.trim() ||
      "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    escrowAddress: process.env.PAYPHONE_ESCROW_WALLET_ADDRESS?.trim() || "",
  };
}

export function circleReady() {
  const { apiKey, entitySecret } = circleConfig();
  return Boolean(apiKey && entitySecret);
}

export function circleClient() {
  const { apiKey, entitySecret } = circleConfig();
  if (!apiKey) throw new Error("CIRCLE_API_KEY is not set in .env");
  if (!entitySecret) {
    throw new Error(
      "CIRCLE_ENTITY_SECRET is not set. Run: npm run circle:setup"
    );
  }
  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

export async function ensureWalletSet(client) {
  const cfg = circleConfig();
  if (cfg.walletSetId) return cfg.walletSetId;

  const response = await client.createWalletSet({ name: "Payphone" });
  const id = response.data?.walletSet?.id;
  if (!id) throw new Error("Circle did not return a wallet set id");

  console.log(`Created Circle wallet set: ${id}`);
  console.log(`Add to .env: CIRCLE_WALLET_SET_ID=${id}`);
  return id;
}

export async function registerNewEntitySecret(apiKey) {
  const entitySecret = generateEntitySecret();
  const response = await registerEntitySecretCiphertext({ apiKey, entitySecret });
  return { entitySecret, recoveryFile: response.data?.recoveryFile };
}

export function formatBalances(tokenBalances = []) {
  return tokenBalances.map((b) => ({
    token_id: b.token?.id ?? null,
    symbol: b.token?.symbol ?? b.token?.name ?? "TOKEN",
    amount: b.amount ?? "0",
    blockchain: b.token?.blockchain ?? null,
    token_address: b.token?.tokenAddress ?? null,
  }));
}

export async function createUsdcTransfer(client, { walletId, destinationAddress, amount, refId }) {
  const { usdcTokenAddress, blockchain } = circleConfig();
  const response = await client.createTransaction({
    idempotencyKey: randomUUID(),
    walletId,
    destinationAddress,
    amounts: [String(amount)],
    tokenAddress: usdcTokenAddress,
    blockchain,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    refId,
  });
  const tx = response.data?.id
    ? { id: response.data.id, state: response.data.state ?? "pending" }
    : null;
  if (!tx?.id) throw new Error("Circle did not return a transaction id");
  return tx;
}
