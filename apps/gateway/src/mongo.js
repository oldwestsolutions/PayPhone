import { MongoClient } from "mongodb";

let client = null;
let db = null;

export async function connectMongo() {
  const url = process.env.MONGODB_URL || "mongodb://localhost:27017/payphone";
  if (db) return db;
  client = new MongoClient(url);
  await client.connect();
  db = client.db();
  await ensureIndexes(db);
  console.log(`[mongo] connected: ${url.replace(/\/\/.*@/, "//***@")}`);
  return db;
}

export function getDb() {
  if (!db) throw new Error("MongoDB not connected — call connectMongo() first");
  return db;
}

async function ensureIndexes(database) {
  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database.collection("users").createIndex({ username: 1 }, { unique: true });
  await database.collection("users").createIndex({ supabase_id: 1 }, { unique: true, sparse: true });
  await database.collection("payments").createIndex({ id: 1 }, { unique: true });
  await database.collection("payment_events").createIndex({ paymentId: 1 });
  await database.collection("bond_contracts").createIndex({ bond_id: 1 }, { unique: true });
  await database.collection("disputes").createIndex({ dispute_id: 1 }, { unique: true });
  await database.collection("claims").createIndex({ claim_id: 1 }, { unique: true });
  await database.collection("storage_invoices").createIndex({ invoice_id: 1 }, { unique: true });
  await database.collection("storage_invoices").createIndex({ username: 1 });
  await database.collection("intents").createIndex({ intent_id: 1 }, { unique: true });
  await database.collection("route_plans").createIndex({ route_plan_id: 1 }, { unique: true });
  await database.collection("execution_events").createIndex({ event_id: 1 }, { unique: true });
}

export async function persistPayment(payment) {
  const database = getDb();
  await database.collection("payments").updateOne(
    { id: payment.id },
    { $set: payment },
    { upsert: true }
  );
}

export async function persistPaymentEvent(event) {
  const database = getDb();
  await database.collection("payment_events").insertOne(event);
}

export async function getPayment(id) {
  return getDb().collection("payments").findOne({ id });
}

export async function listPaymentsForUser(username) {
  return getDb()
    .collection("payments")
    .find({ $or: [{ sender: username }, { recipient: username }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
}
