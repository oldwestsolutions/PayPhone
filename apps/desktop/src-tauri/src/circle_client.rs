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

pub fn demo_mode() -> bool {
    std::env::var("PAYPHONE_DEMO_MODE")
        .map(|v| v != "false" && v != "0")
        .unwrap_or(true)
}

/// Creates a Circle wallet via the Payphone gateway (demo wallet if gateway unavailable).
pub async fn create_wallet(gateway_url: &str, username: &str) -> Result<CircleWallet, String> {
    let url = format!("{}/api/wallet/create", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({ "username": username });

    let resp = match reqwest::Client::new().post(&url).json(&body).send().await {
        Ok(r) => r,
        Err(e) => {
            if demo_mode() {
                return Ok(demo_wallet(username));
            }
            return Err(format!("Gateway unreachable: {e}"));
        }
    };

    if !resp.status().is_success() {
        if demo_mode() {
            return Ok(demo_wallet(username));
        }
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

pub fn demo_usdc_balance() -> String {
    "1000.00".into()
}

pub async fn get_wallet_balances(
    gateway_url: &str,
    wallet_id: &str,
) -> Result<(Vec<CircleBalance>, String), String> {
    if wallet_id.starts_with("circle-demo-") {
        let usdc = if demo_mode() {
            demo_usdc_balance()
        } else {
            "0".into()
        };
        return Ok((vec![], usdc));
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

#[derive(Debug, Deserialize)]
struct SettleResponse {
    data: SettleData,
}

#[derive(Debug, Deserialize)]
struct SettleData {
    seller_amount: f64,
    platform_fee: f64,
    refund_amount: f64,
    simulated: bool,
}

pub async fn settle_escrow(
    gateway_url: &str,
    contract_id: &str,
    escrow_amount: f64,
    charge_amount: f64,
    toll_amount: f64,
    seller_wallet_address: &str,
    buyer_wallet_address: &str,
    from_party: &str,
) -> Result<crate::models::SettlementResult, String> {
    let url = format!("{}/api/escrow/settle", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "contractId": contract_id,
        "escrowAmount": escrow_amount,
        "chargeAmount": charge_amount,
        "tollAmount": toll_amount,
        "sellerWalletAddress": seller_wallet_address,
        "buyerWalletAddress": buyer_wallet_address,
        "fromParty": from_party,
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
        return Err(msg.unwrap_or_else(|| format!("Settlement error {status}")));
    }

    let parsed: SettleResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid settlement response: {e}"))?;

    Ok(crate::models::SettlementResult {
        seller_amount: parsed.data.seller_amount,
        platform_fee: parsed.data.platform_fee,
        refund_amount: parsed.data.refund_amount,
        simulated: parsed.data.simulated,
    })
}

#[derive(Debug, Deserialize)]
struct TransferDataResponse {
    data: TransferPayload,
}

#[derive(Debug, Deserialize)]
struct TransferPayload {
    transaction: CircleTransferResult,
    amount_sent: f64,
    recipient_amount: f64,
    platform_fee: f64,
    simulated: bool,
}

pub async fn send_usdc_transfer(
    gateway_url: &str,
    wallet_id: &str,
    destination_address: &str,
    amount: f64,
    from_party: &str,
) -> Result<crate::models::SendUsdcResult, String> {
    if wallet_id.starts_with("circle-demo-") && demo_mode() {
        let (fee, recipient) = crate::platform_fee::calculate_p2p_fee(amount);
        return Ok(crate::models::SendUsdcResult {
            transaction_id: format!("demo-send-{}", uuid_simple()),
            amount_sent: amount,
            recipient_amount: recipient,
            platform_fee: fee,
            simulated: true,
        });
    }

    let url = format!("{}/api/transfer", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "walletId": wallet_id,
        "destinationAddress": destination_address,
        "amount": format!("{amount:.2}"),
        "fromParty": from_party,
        "collectPlatformFee": true,
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
        return Err(msg.unwrap_or_else(|| format!("Transfer error {status}")));
    }

    let parsed: TransferDataResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid transfer response: {e}"))?;

    Ok(crate::models::SendUsdcResult {
        transaction_id: parsed.data.transaction.id,
        amount_sent: parsed.data.amount_sent,
        recipient_amount: parsed.data.recipient_amount,
        platform_fee: parsed.data.platform_fee,
        simulated: parsed.data.simulated,
    })
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{t}")
}
