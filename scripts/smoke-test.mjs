/**
 * End-to-end smoke test for Payphone backend services.
 * Run: node scripts/smoke-test.mjs
 * Requires: gateway (4000), telephony shim (4010), escrow shim (4004)
 */
const TELEPHONY = process.env.PAYPHONE_TELEPHONY_ENGINE_URL || "http://localhost:4010";
const ESCROW = process.env.PAYPHONE_ESCROW_ENGINE_URL || "http://localhost:4004";
const GATEWAY = process.env.PAYPHONE_API_GATEWAY_URL || "http://localhost:4000";

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

async function json(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !body.ok) {
    throw new Error(`${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  console.log("Payphone smoke test\n");

  await check("Gateway health", async () => {
    const h = await json(`${GATEWAY}/health`);
    if (!h.ok) throw new Error("not ok");
  });

  await check("Telephony health", async () => {
    const h = await json(`${TELEPHONY}/health`);
    if (!h.ok) throw new Error("not ok");
  });

  await check("Escrow health", async () => {
    const h = await json(`${ESCROW}/health`);
    if (!h.ok) throw new Error("not ok");
  });

  await check("Register phone lines (alice + bob)", async () => {
    for (const [name, phone] of [
      ["alice.42line", "+15551234001"],
      ["bob.99test", "+15551234002"],
    ]) {
      const r = await json(`${TELEPHONY}/v1/phones/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stellarName: name,
          personalPhone: phone,
          accountType: "Consumer",
        }),
      });
      if (!r.ok) throw new Error(r.error);
    }
  });

  await check("Stellar profile + name call", async () => {
    await json(`${TELEPHONY}/v1/stellar/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stellarName: "bob.99test",
        publicKey: "GBOBTESTKEY1234567890",
        dialAddress: "@bob.99test · GBOBTEST…7890",
        reachable: true,
      }),
    });
    const call = await json(`${TELEPHONY}/v1/calls/name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromName: "alice.42line",
        toName: "bob.99test",
        circleWalletId: "demo",
      }),
    });
    if (!call.ok || call.data.callerIdShown !== "RESTRICTED") {
      throw new Error("call failed or wrong caller ID");
    }
  });

  await check("SMS with digital signature", async () => {
    const crypto = await import("node:crypto");
    const sig = crypto
      .createHash("sha256")
      .update("alice.42line|GALICE|hello")
      .digest("hex");
    const r = await json(`${TELEPHONY}/v1/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromName: "alice.42line",
        toName: "bob.99test",
        body: "hello",
        stellarPublicKey: "GALICE",
        digitalSignature: sig,
      }),
    });
    if (!r.ok) throw new Error(r.error);
  });

  await check("Filecoin pay quote", async () => {
    const r = await json(`${TELEPHONY}/v1/pay/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageGibMonths: 2, transferMib: 50, reason: "test" }),
    });
    if (!r.ok || r.data.totalUsdc <= 0) throw new Error("bad quote");
  });

  await check("Standard escrow create + fund", async () => {
    const create = await json(`${ESCROW}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId: "esc-smoke-1",
        buyerId: "alice.42line",
        sellerId: "bob.99test",
        amount: 10,
        currency: "USDC",
        buyerBalance: 100,
      }),
    });
    if (!create.contract) throw new Error("no contract");
    const tr = await json(`${ESCROW}/contracts/esc-smoke-1/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "fund", requesterId: "alice.42line" }),
    });
    if (tr.contract?.status !== "Funded") throw new Error("fund failed");
  });

  await check("Gateway pay quote", async () => {
    const r = await json(`${GATEWAY}/api/pay/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageGibMonths: 1, transferMib: 10 }),
    });
    if (!r.data?.totalUsdc) throw new Error("no quote");
  });

  await check("Procurement commitment + fund + milestone", async () => {
    const created = await json(`${GATEWAY}/api/procurement/commitments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerId: "alice.42line",
        supplierId: "bob.99test",
        totalAmount: 1000,
        buyerBalance: 5000,
        lineItems: [{ sku: "WIDGET-1", quantity: 10 }],
      }),
    });
    const id = created.data?.commitment_id;
    if (!id) throw new Error("no commitment");
    const funded = await json(`${GATEWAY}/api/procurement/commitments/${id}/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletId: "circle-demo-alice",
        requesterId: "alice.42line",
      }),
    });
    if (funded.data?.commitment?.status !== "funded") throw new Error("fund failed");
    const accepted = await json(`${GATEWAY}/api/procurement/commitments/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "accept", requesterId: "bob.99test" }),
    });
    if (accepted.data?.status !== "active") throw new Error("accept failed");
  });

  await check("Escrow settlement with platform fee", async () => {
    const r = await json(`${GATEWAY}/api/escrow/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId: "esc-smoke-1",
        escrowAmount: 10,
        chargeAmount: 10,
        sellerWalletAddress: "0xseller",
        buyerWalletAddress: "0xbuyer",
        fromParty: "alice.42line",
      }),
    });
    if (!r.data?.platform_fee) throw new Error("no platform fee");
  });

  await check("P2P transfer with fee", async () => {
    const r = await json(`${GATEWAY}/api/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletId: "circle-demo-alice",
        destinationAddress: "0xrecipient",
        amount: "100",
        fromParty: "alice.42line",
      }),
    });
    if (r.data?.platform_fee == null) throw new Error("no fee");
  });

  await check("Platform revenue endpoint", async () => {
    const r = await json(`${GATEWAY}/api/platform/revenue`);
    if (r.data?.all_time_total_usdc == null) throw new Error("no revenue data");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
