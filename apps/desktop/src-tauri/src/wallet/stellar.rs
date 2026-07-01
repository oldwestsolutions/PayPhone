use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct HorizonAccount {
    balances: Vec<HorizonBalance>,
}

#[derive(Debug, Deserialize)]
struct HorizonBalance {
    balance: String,
    #[serde(rename = "asset_type")]
    asset_type: String,
}

/// Query Stellar Horizon for native XLM balance (testnet by default).
pub async fn horizon_balance(public_key: &str) -> Result<String, String> {
    let horizon = std::env::var("PAYPHONE_STELLAR_HORIZON")
        .unwrap_or_else(|_| "https://horizon-testnet.stellar.org".into());
    let url = format!("{horizon}/accounts/{public_key}");

    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Horizon unreachable: {e}"))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok("0".into());
    }

    if !resp.status().is_success() {
        return Err(format!("Horizon returned {}", resp.status()));
    }

    let account: HorizonAccount = resp.json().await.map_err(|e| e.to_string())?;
    let native = account
        .balances
        .iter()
        .find(|b| b.asset_type == "native")
        .map(|b| b.balance.clone())
        .unwrap_or_else(|| "0".into());

    Ok(native)
}
