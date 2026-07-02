/**
 * Start full Payphone dev stack (V6 orchestration + V5 services).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;

const services = [
  { name: "gateway", script: "gateway:dev" },
  { name: "intent", script: "intent:dev" },
  { name: "routing", script: "routing:dev" },
  { name: "orchestrator", script: "orchestrator:dev" },
  { name: "ledger", script: "ledger:dev" },
  { name: "telephony", script: "telephony:dev" },
  { name: "escrow", script: "escrow:dev" },
];

console.log(
  "Starting Payphone V6 stack:\n" +
    "  gateway :4000  intent :4008  routing :4009  orchestrator :4011  ledger :4012\n" +
    "  telephony :4010  escrow :4004\n"
);

for (const svc of services) {
  const child = spawn(npm, ["run", svc.script], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => console.log(`[${svc.name}] exited ${code}`));
}

process.on("SIGINT", () => process.exit(0));
