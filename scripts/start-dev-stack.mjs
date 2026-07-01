/**
 * Start gateway + telephony + escrow shims for local dev.
 * Usage: node scripts/start-dev-stack.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const services = [
  { name: "gateway", script: "gateway:dev" },
  { name: "telephony", script: "telephony:dev" },
  { name: "escrow", script: "escrow:dev" },
];

console.log("Starting Payphone dev stack (gateway :4000, telephony :4010, escrow :4004)…\n");

for (const svc of services) {
  const child = spawn(npm, ["run", svc.script], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    console.log(`[${svc.name}] exited with code ${code}`);
  });
}

process.on("SIGINT", () => process.exit(0));
