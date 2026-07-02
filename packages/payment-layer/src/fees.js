/** Single source of truth for platform fees */

export const FEE_RATES = {
  escrow_settlement: 0.05,
  p2p_transfer: 0.01,
  toll_commission: 0.1,
  procurement_milestone: 0.05,
  bond_return: 0.01,
  bond_forfeiture_platform: 0.1,
  appeal: 10.0,
  subscription: 0,
};

/**
 * @param {import('./types.js').Payment} payment
 * @returns {import('./types.js').FeeBreakdown}
 */
export function calculateFees(payment) {
  const amount = Number(payment.amount) || 0;
  const toll = Number(payment.metadata?.tollAmount || 0);
  let platformFee = 0;
  let tollCommission = 0;
  let swapFee = 0;
  let feeCollectionTiming = "settlement";

  switch (payment.type) {
    case "transfer":
      if (payment.metadata?.skipPlatformFee) {
        platformFee = 0;
        feeCollectionTiming = "pre_execution";
      } else {
        platformFee = round2(amount * FEE_RATES.p2p_transfer);
        feeCollectionTiming = "pre_execution";
      }
      break;
    case "escrow":
      platformFee = round2(amount * FEE_RATES.escrow_settlement);
      tollCommission = round2(toll * FEE_RATES.toll_commission);
      break;
    case "procurement":
      platformFee = round2(amount * FEE_RATES.procurement_milestone);
      break;
    case "bond":
      platformFee = 0;
      break;
    case "appeal":
      platformFee = FEE_RATES.appeal;
      feeCollectionTiming = "pre_execution";
      break;
    case "subscription":
      platformFee = 0;
      break;
    case "swap":
      swapFee = round2(amount * 0.003);
      break;
    case "invoice":
      platformFee = 0;
      break;
    default:
      platformFee = round2(amount * FEE_RATES.p2p_transfer);
  }

  const totalFees = round2(platformFee + tollCommission + swapFee);
  const recipientAmount = round2(Math.max(0, amount - totalFees));

  return {
    platformFee,
    tollCommission,
    swapFee,
    totalFees,
    recipientAmount,
    feeCollectionTiming,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
