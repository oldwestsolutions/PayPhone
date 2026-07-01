pub mod stellar;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletSummary {
    pub provider: String,
    pub public_key: String,
    pub balance_xlm: String,
    pub balance_usd: String,
    pub circle_wallet_id: String,
    pub circle_address: String,
    pub circle_usdc: String,
    pub circle_balances: Vec<crate::models::CircleBalance>,
    pub circle_live: bool,
    pub funded: bool,
}

pub async fn wallet_summary(
    gateway_url: &str,
    stellar_public_key: &str,
    circle_wallet_id: &str,
    circle_address: &str,
) -> Result<WalletSummary, String> {
    let balance = stellar::horizon_balance(stellar_public_key)
        .await
        .unwrap_or_else(|_| "0".into());
    let stellar_funded = balance != "0" && balance != "0.0000000";

    let (circle_balances, circle_usdc, circle_live) =
        match crate::circle_client::get_wallet_balances(gateway_url, circle_wallet_id).await {
            Ok((balances, usdc)) => (balances, usdc, !circle_wallet_id.starts_with("circle-demo-")),
            Err(_) => (vec![], "—".into(), false),
        };

    let circle_funded = circle_usdc != "—" && circle_usdc != "0" && circle_usdc != "0.0";

    Ok(WalletSummary {
        provider: if circle_live { "circle+stellar" } else { "stellar" }.into(),
        public_key: stellar_public_key.into(),
        balance_xlm: balance,
        balance_usd: if circle_live {
            format!("{circle_usdc} USDC")
        } else {
            "—".into()
        },
        circle_wallet_id: circle_wallet_id.into(),
        circle_address: circle_address.into(),
        circle_usdc,
        circle_balances,
        circle_live,
        funded: stellar_funded || circle_funded,
    })
}
