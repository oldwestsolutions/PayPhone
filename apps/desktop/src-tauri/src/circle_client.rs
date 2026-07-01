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

/// Creates a Circle programmable wallet via the Payphone API gateway.
pub async fn create_wallet(gateway_url: &str, username: &str) -> Result<CircleWallet, String> {
    let url = format!("{}/api/wallet/create", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({ "username": username, "blockchain": "MATIC" });

    let resp = reqwest::Client::new()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            format!(
                "API gateway unreachable at {gateway_url}. Start it with: npm run gateway:dev ({e})"
            )
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        if let Ok(err) = resp.json::<GatewayError>().await {
            if let Some(msg) = err.error {
                return Err(msg);
            }
        }
        return Err(format!("Wallet creation failed ({status})"));
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
