use crate::models::{CircleBalance, CircleTransferResult, CircleWallet};
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
struct BalancesResponse {
    data: BalancesData,
}

#[derive(Debug, Deserialize)]
struct BalancesData {
    balances: Vec<CircleBalance>,
    usdc_balance: String,
    #[serde(default)]
    usdc_token_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TransferResponse {
    data: TransferData,
}

#[derive(Debug, Deserialize)]
struct TransferData {
    transaction: CircleTransferResult,
}

#[derive(Debug, Deserialize)]
struct ErrorBody {
    error: Option<String>,
}

pub fn demo_wallet(username: &str) -> CircleWallet {
    CircleWallet {
        wallet_id: format!("circle-demo-{username}"),
        address: format!("0x{}", hex::encode(username.as_bytes())),
    }
}

/// Creates a Circle wallet via the Payphone gateway.
pub async fn create_wallet(gateway_url: &str, username: &str) -> Result<CircleWallet, String> {
    let url = format!("{}/api/wallet/create", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({ "username": username });

    let resp = match reqwest::Client::new().post(&url).json(&body).send().await {
        Ok(r) => r,
        Err(e) => return Err(format!("Gateway unreachable: {e}")),
    };

    if !resp.status().is_success() {
        let status = resp.status();
        let msg = resp.json::<ErrorBody>().await.ok().and_then(|b| b.error);
        return Err(msg.unwrap_or_else(|| format!("Gateway error {status}")));
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

pub async fn get_wallet_balances(
    gateway_url: &str,
    wallet_id: &str,
) -> Result<(Vec<CircleBalance>, String), String> {
    if wallet_id.starts_with("circle-demo-") {
        return Ok((vec![], "0".into()));
    }

    let url = format!(
        "{}/api/wallet/{}/balances",
        gateway_url.trim_end_matches('/'),
        wallet_id
    );
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Gateway unreachable: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let msg = resp.json::<ErrorBody>().await.ok().and_then(|b| b.error);
        return Err(msg.unwrap_or_else(|| format!("Gateway error {status}")));
    }

    let parsed: BalancesResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid balances response: {e}"))?;

    Ok((parsed.data.balances, parsed.data.usdc_balance))
}

pub async fn fund_escrow(
    gateway_url: &str,
    wallet_id: &str,
    contract_id: &str,
    amount: &str,
) -> Result<CircleTransferResult, String> {
    let url = format!("{}/api/escrow/fund", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "walletId": wallet_id,
        "contractId": contract_id,
        "amount": amount,
    });

    let resp = reqwest::Client::new()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gateway unreachable: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let msg = resp.json::<ErrorBody>().await.ok().and_then(|b| b.error);
        return Err(msg.unwrap_or_else(|| format!("Gateway error {status}")));
    }

    let parsed: TransferResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid transfer response: {e}"))?;

    Ok(parsed.data.transaction)
}
