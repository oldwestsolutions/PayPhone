pub mod stellar;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletSummary {
    pub provider: String,
    pub public_key: String,
    pub balance_xlm: String,
    pub balance_usd: String,
    pub circle_address: String,
    pub funded: bool,
}

pub async fn wallet_summary(
    stellar_public_key: &str,
    circle_address: &str,
) -> Result<WalletSummary, String> {
    let balance = stellar::horizon_balance(stellar_public_key)
        .await
        .unwrap_or_else(|_| "0".into());
    let funded = balance != "0" && balance != "0.0000000";
    Ok(WalletSummary {
        provider: "stellar".into(),
        public_key: stellar_public_key.into(),
        balance_xlm: balance,
        balance_usd: "—".into(),
        circle_address: circle_address.into(),
        funded,
    })
}
