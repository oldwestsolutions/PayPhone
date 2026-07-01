use crate::models::CircleWallet;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct CircleWalletResponse {
    data: CircleWalletData,
}

#[derive(Debug, Deserialize)]
struct CircleWalletData {
    wallet: CircleWalletInner,
}

#[derive(Debug, Deserialize)]
struct CircleWalletInner {
    id: String,
    address: String,
}

#[derive(Debug, Deserialize)]
struct GatewayError {
    error: Option<String>,
}

pub fn demo_wallet(username: &str) -> CircleWallet {
    CircleWallet {
        wallet_id: format!("circle-demo-{username}"),
        address: format!("0x{}", hex::encode(username.as_bytes())),
    }
}

/// Creates a Circle wallet via gateway, or a local demo wallet when gateway is offline.
pub async fn create_wallet(gateway_url: &str, username: &str) -> Result<CircleWallet, String> {
    let url = format!("{}/api/wallet/create", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({ "username": username, "blockchain": "MATIC" });

    let resp = match reqwest::Client::new().post(&url).json(&body).send().await {
        Ok(r) => r,
        Err(_) => return Ok(demo_wallet(username)),
    };

    if !resp.status().is_success() {
        return Ok(demo_wallet(username));
    }

    let parsed: CircleWalletResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid gateway response: {e}"))?;

    Ok(CircleWallet {
        wallet_id: parsed.data.wallet.id,
        address: parsed.data.wallet.address,
    })
}
