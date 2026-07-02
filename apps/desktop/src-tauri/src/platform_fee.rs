use serde::{Deserialize, Serialize};

pub const ESCROW_SETTLEMENT_FEE_PCT: f64 = 0.05;
pub const P2P_TRANSFER_FEE_PCT: f64 = 0.01;
pub const TOLL_COMMISSION_PCT: f64 = 0.10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettlementFeeBreakdown {
    pub platform_fee: f64,
    pub toll_commission: f64,
    pub seller_amount: f64,
    pub total_platform: f64,
    pub refund_amount: f64,
}

pub fn calculate_settlement_fees(charge: f64, toll_amount: f64, escrow_amount: f64) -> SettlementFeeBreakdown {
    let platform_fee = round2(charge * ESCROW_SETTLEMENT_FEE_PCT);
    let toll_commission = round2(toll_amount * TOLL_COMMISSION_PCT);
    let seller_amount = round2(charge - platform_fee);
    let total_platform = round2(platform_fee + toll_commission);
    let refund_amount = round2((escrow_amount - charge).max(0.0));
    SettlementFeeBreakdown {
        platform_fee,
        toll_commission,
        seller_amount,
        total_platform,
        refund_amount,
    }
}

pub fn calculate_p2p_fee(amount: f64) -> (f64, f64) {
    let fee = round2(amount * P2P_TRANSFER_FEE_PCT);
    (fee, round2(amount - fee))
}

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}
