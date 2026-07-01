/**
 * One-time Circle entity secret registration.
 * Generates a 32-byte entity secret, registers it with Circle, and appends to root .env.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

dotenv.config({ path: envPath });

const apiKey = process.env.CIRCLE_API_KEY?.trim();
if (!apiKey) {
  console.error("CIRCLE_API_KEY missing in .env");
  process.exit(1);
}

if (process.env.CIRCLE_ENTITY_SECRET?.trim()) {
  console.log("CIRCLE_ENTITY_SECRET already set — skipping registration.");
  process.exit(0);
}

// 32-byte hex entity secret (Circle W3S requirement)
const entitySecret = crypto.randomBytes(32).toString("hex");
console.log("Registering new entity secret with Circle…");

const response = await registerEntitySecretCiphertext({ apiKey, entitySecret });
const recovery = response.data?.recoveryFile;

const recoveryDir = path.join(root, "recovery");
fs.mkdirSync(recoveryDir, { recursive: true });
const recoveryPath = path.join(recoveryDir, `recovery_file_${Date.now()}.dat`);
if (recovery) {
  fs.writeFileSync(recoveryPath, JSON.stringify(recovery, null, 2));
  console.log(`Recovery file saved: ${recoveryPath}`);
}

let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
if (/^CIRCLE_ENTITY_SECRET=/m.test(env)) {
  env = env.replace(/^CIRCLE_ENTITY_SECRET=.*$/m, `CIRCLE_ENTITY_SECRET=${entitySecret}`);
} else {
  env += `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`;
}
fs.writeFileSync(envPath, env);
console.log("CIRCLE_ENTITY_SECRET written to .env");
console.log("Next: npm run gateway:dev");
