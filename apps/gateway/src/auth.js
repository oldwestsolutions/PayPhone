import { createClient } from "@supabase/supabase-js";
import { getDb } from "./mongo.js";
import { circleClient, circleReady, createUsdcTransfer, ensureWalletSet, circleConfig } from "./circle.js";
import { randomUUID } from "node:crypto";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export async function registerUser({ email, password, phone, username }) {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = String(phone).trim();
  const normalizedUsername = String(username).trim().toLowerCase();

  if (!normalizedEmail || !password || !normalizedPhone || !normalizedUsername) {
    throw new Error("email, password, phone, and username are required");
  }
  if (normalizedUsername.length < 7 || !/\d/.test(normalizedUsername)) {
    throw new Error("Username must be 7+ characters and include a number");
  }

  const db = getDb();
  const existing = await db.collection("users").findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });
  if (existing) throw new Error("Email or username already registered");

  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email: normalizedEmail,
    password,
    phone: normalizedPhone,
    email_confirm: true,
    user_metadata: { username: normalizedUsername, phone: normalizedPhone },
  });
  if (authError) throw new Error(authError.message);

  let circleWallet = { wallet_id: `pending-${normalizedUsername}`, address: "" };
  if (circleReady()) {
    try {
      const client = circleClient();
      const setId = await ensureWalletSet(client);
      const cfg = circleConfig();
      const response = await client.createWallets({
        idempotencyKey: randomUUID(),
        walletSetId: setId,
        blockchains: [cfg.blockchain],
        count: 1,
        accountType: "EOA",
        metadata: [{ name: `Payphone ${normalizedUsername}`, refId: normalizedUsername }],
      });
      const w = response.data?.wallets?.[0];
      if (w?.id && w?.address) circleWallet = { wallet_id: w.id, address: w.address };
    } catch (e) {
      console.warn("[auth] Circle wallet creation failed:", e.message);
    }
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  const role = adminEmails.includes(normalizedEmail) ? "admin" : "user";

  const userDoc = {
    supabase_id: authData.user.id,
    email: normalizedEmail,
    phone: normalizedPhone,
    username: normalizedUsername,
    role,
    circle_wallet_id: circleWallet.wallet_id,
    circle_wallet_address: circleWallet.address,
    stellar_public_key: `G_PENDING_${normalizedUsername}`,
    account_type: "consumer",
    storage_paid: false,
    storage_credits_gib: 0,
    comms_credits: 0,
    registration_complete: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  await db.collection("users").insertOne(userDoc);

  const { data: signIn, error: signInError } = await sb.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (signInError) throw new Error(signInError.message);

  return { user: userDoc, session: signIn.session };
}

export async function loginUser({ email, password }) {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("Supabase is not configured");

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data, error } = await sb.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) throw new Error(error.message);

  const db = getDb();
  const user = await db.collection("users").findOne({ supabase_id: data.user.id });
  if (!user || !user.registration_complete) {
    throw new Error("Account registration incomplete. Complete signup at payphone.cc/account");
  }

  return { user, session: data.session };
}

export async function verifyToken(accessToken) {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(accessToken);
  if (error || !data.user) return null;
  const user = await getDb().collection("users").findOne({ supabase_id: data.user.id });
  return user;
}

export function authMiddleware(requiredRole = null) {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authorization required" });

    const user = await verifyToken(token);
    if (!user) return res.status(401).json({ error: "Invalid or expired session" });
    if (requiredRole === "admin" && user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = user;
    req.accessToken = token;
    next();
  };
}
