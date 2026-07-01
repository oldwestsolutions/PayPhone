import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.resolve(__dirname, "../../../data/platform-fees.json");

export const ESCROW_SETTLEMENT_FEE_PCT = 0.05;
export const P2P_TRANSFER_FEE_PCT = 0.01;
export const TOLL_COMMISSION_PCT = 0.1;

export function calculateSettlementFees(charge, tollAmount = 0) {
  const chargeNum = Number(charge) || 0;
  const tollNum = Number(tollAmount) || 0;
  const platformFee = round2(chargeNum * ESCROW_SETTLEMENT_FEE_PCT);
  const tollCommission = round2(tollNum * TOLL_COMMISSION_PCT);
  const sellerAmount = round2(chargeNum - platformFee);
  const totalPlatform = round2(platformFee + tollCommission);
  return { platformFee, tollCommission, sellerAmount, totalPlatform };
}

export function calculateP2pFee(amount) {
  const amt = Number(amount) || 0;
  const fee = round2(amt * P2P_TRANSFER_FEE_PCT);
  const recipientAmount = round2(amt - fee);
  return { fee, recipientAmount };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function ensureLedger() {
  const dir = path.dirname(LEDGER_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify({ fees: [] }, null, 2));
  }
}

function readLedger() {
  ensureLedger();
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return { fees: [] };
  }
}

function writeLedger(data) {
  ensureLedger();
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2));
}

export function recordPlatformFee({
  feeType,
  amount,
  fromParty,
  escrowContractId = null,
  bondContractId = null,
  circleTransferId = null,
  commitmentId = null,
}) {
  const ledger = readLedger();
  const entry = {
    fee_id: randomUUID(),
    fee_type: feeType,
    amount: round2(Number(amount)),
    from_party: fromParty,
    escrow_contract_id: escrowContractId,
    bond_contract_id: bondContractId,
    commitment_id: commitmentId,
    circle_transfer_id: circleTransferId,
    collected_at: Date.now(),
  };
  ledger.fees.push(entry);
  writeLedger(ledger);
  return entry;
}

export function getRevenueSummary() {
  const ledger = readLedger();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthFees = ledger.fees.filter((f) => f.collected_at >= monthStart);
  const byType = {};
  let monthTotal = 0;
  for (const f of monthFees) {
    byType[f.fee_type] = (byType[f.fee_type] || 0) + f.amount;
    monthTotal += f.amount;
  }
  return {
    month_total_usdc: round2(monthTotal),
    all_time_total_usdc: round2(ledger.fees.reduce((s, f) => s + f.amount, 0)),
    by_type: byType,
    recent: ledger.fees.slice(-20).reverse(),
    count: ledger.fees.length,
  };
}
