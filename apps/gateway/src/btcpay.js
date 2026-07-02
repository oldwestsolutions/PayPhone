import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "./mongo.js";

const STORAGE_PLAN_USD = "9.99";

export function btcpayConfigured() {
  return Boolean(
    process.env.PAYPHONE_BTCPAY_URL?.trim() &&
      process.env.PAYPHONE_BTCPAY_API_KEY?.trim() &&
      process.env.PAYPHONE_BTCPAY_STORE_ID?.trim()
  );
}

function btcpayBase() {
  const url = process.env.PAYPHONE_BTCPAY_URL?.trim().replace(/\/$/, "");
  const storeId = process.env.PAYPHONE_BTCPAY_STORE_ID?.trim();
  if (!url || !storeId) throw new Error("BTCPay is not configured");
  return { url, storeId };
}

function invoiceUrl(invoiceId) {
  const { url, storeId } = btcpayBase();
  const base = `${url}/api/v1/stores/${storeId}/invoices`;
  return invoiceId ? `${base}/${invoiceId}` : base;
}

function authHeaders() {
  return {
    Authorization: `token ${process.env.PAYPHONE_BTCPAY_API_KEY?.trim()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a storage subscription invoice. Metadata orderId: storage-1gb-{username}
 */
export async function createStorageInvoice(username) {
  if (!btcpayConfigured()) throw new Error("BTCPay is not configured");

  const resp = await fetch(invoiceUrl(), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      amount: STORAGE_PLAN_USD,
      currency: "USD",
      metadata: {
        orderId: `storage-1gb-${username}`,
        product: "Payphone 1GB Storage",
        username,
      },
    }),
  });

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(body?.message || body?.error || `BTCPay returned ${resp.status}`);
  }

  await getDb().collection("storage_invoices").updateOne(
    { invoice_id: body.id },
    {
      $set: {
        invoice_id: body.id,
        username,
        amount: STORAGE_PLAN_USD,
        status: body.status || "New",
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    },
    { upsert: true }
  );

  return {
    id: body.id,
    checkout_link: body.checkoutLink,
    amount: body.amount,
    currency: body.currency,
    status: body.status,
    description: "1 GB secure storage — contacts & call history",
  };
}

export async function getInvoiceStatus(invoiceId) {
  if (!btcpayConfigured()) throw new Error("BTCPay is not configured");

  const resp = await fetch(invoiceUrl(invoiceId), { headers: authHeaders() });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body?.message || `BTCPay returned ${resp.status}`);
  return body;
}

function isPaidStatus(status) {
  return ["Settled", "Processing", "Paid", "Complete"].includes(String(status));
}

/**
 * Activate storage credits for a user in MongoDB.
 */
export async function activateUserStorage(username, invoiceId) {
  const db = getDb();
  const result = await db.collection("users").findOneAndUpdate(
    { username },
    {
      $set: {
        storage_paid: true,
        storage_invoice_id: invoiceId,
        storage_credits_gib: 1,
        comms_credits: 1000,
        updated_at: Date.now(),
      },
    },
    { returnDocument: "after" }
  );

  if (!result) throw new Error(`User not found: ${username}`);

  await db.collection("storage_invoices").updateOne(
    { invoice_id: invoiceId },
    { $set: { status: "Settled", activated_at: Date.now(), updated_at: Date.now() } },
    { upsert: true }
  );

  return result;
}

export async function syncStorageFromInvoice(invoice) {
  const username =
    invoice.metadata?.username ||
    String(invoice.metadata?.orderId || "")
      .replace(/^storage-1gb-/, "")
      .trim();

  if (!username) {
    console.warn("[btcpay] invoice missing username metadata", invoice.id);
    return null;
  }

  if (!isPaidStatus(invoice.status)) return null;
  return activateUserStorage(username, invoice.id);
}

/**
 * Verify BTCPay webhook signature (HMAC-SHA256 of raw body).
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYPHONE_BTCPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return true; // allow in dev when secret not set
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = String(signatureHeader).replace(/^sha256=/, "");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return expected === received;
  }
}

/**
 * Handle BTCPay invoice webhook payload.
 */
export async function handleBtcpayWebhook(payload) {
  const type = payload?.type || payload?.deliveryId;
  const invoice = payload?.invoice || payload?.data || payload;

  if (!invoice?.id) {
    return { handled: false, reason: "no invoice in payload" };
  }

  const status = invoice.status;
  if (!isPaidStatus(status)) {
    await getDb()
      .collection("storage_invoices")
      .updateOne(
        { invoice_id: invoice.id },
        { $set: { status, updated_at: Date.now() } },
        { upsert: true }
      );
    return { handled: true, activated: false, status };
  }

  const user = await syncStorageFromInvoice(invoice);
  return { handled: true, activated: Boolean(user), username: user?.username, event: type };
}

export async function getUserStorageStatus(username) {
  const user = await getDb().collection("users").findOne({ username });
  if (!user) throw new Error("User not found");
  return {
    storage_paid: Boolean(user.storage_paid),
    storage_credits_gib: user.storage_credits_gib ?? 0,
    comms_credits: user.comms_credits ?? 0,
    storage_invoice_id: user.storage_invoice_id || null,
  };
}
