use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct AuthUserDoc {
  username: String,
  email: String,
  phone: String,
  role: String,
  circle_wallet_id: String,
  circle_wallet_address: String,
  stellar_public_key: String,
  storage_paid: bool,
  storage_credits_gib: f64,
  comms_credits: f64,
  #[serde(default)]
  account_type: String,
}

#[derive(Debug, Deserialize)]
struct SessionDoc {
  access_token: String,
}

#[derive(Debug, Deserialize)]
struct AuthData {
  user: AuthUserDoc,
  session: SessionDoc,
}

#[derive(Debug, Deserialize)]
struct AuthResponse {
  data: AuthData,
}

#[derive(Debug, Deserialize)]
struct ErrorBody {
  error: Option<String>,
}

pub struct GatewayAuthResult {
    pub user: crate::models::UserAccount,
    pub access_token: String,
}

pub async fn gateway_register(
    gateway_url: &str,
    email: &str,
    password: &str,
    phone: &str,
    username: &str,
) -> Result<GatewayAuthResult, String> {
    let url = format!("{}/api/auth/register", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "email": email,
        "password": password,
        "phone": phone,
        "username": username,
    });
    let resp = reqwest::Client::new()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gateway unreachable: {e}"))?;

    if !resp.status().is_success() {
        let msg = resp.json::<ErrorBody>().await.ok().and_then(|b| b.error);
        return Err(msg.unwrap_or_else(|| "Registration failed".into()));
    }

    let parsed: AuthResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid auth response: {e}"))?;

    Ok(map_auth(parsed))
}

pub async fn gateway_login(
    gateway_url: &str,
    email: &str,
    password: &str,
) -> Result<GatewayAuthResult, String> {
    let url = format!("{}/api/auth/login", gateway_url.trim_end_matches('/'));
    let body = serde_json::json!({ "email": email, "password": password });
    let resp = reqwest::Client::new()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gateway unreachable: {e}"))?;

    if !resp.status().is_success() {
        let msg = resp.json::<ErrorBody>().await.ok().and_then(|b| b.error);
        return Err(msg.unwrap_or_else(|| "Invalid email or password".into()));
    }

    let parsed: AuthResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid auth response: {e}"))?;

    Ok(map_auth(parsed))
}

fn map_auth(parsed: AuthResponse) -> GatewayAuthResult {
    let u = parsed.data.user;
    let username = u.username.clone();
    let token = parsed.data.session.access_token.clone();
    let stellar_secret = "S_GATEWAY_MANAGED".to_string();
    let user = crate::models::UserAccount {
        username: u.username,
        email: u.email,
        phone: u.phone,
        password_hash: String::new(),
        stellar_public_key: u.stellar_public_key,
        stellar_secret,
        circle_wallet_id: u.circle_wallet_id,
        circle_wallet_address: u.circle_wallet_address,
        masked_number: crate::telephony::derive_masked_number(&username),
        personal_phone: String::new(),
        account_type: if u.account_type.is_empty() {
            "consumer".into()
        } else {
            u.account_type
        },
        call_toll_usdc: None,
        sms_toll_usdc: None,
        message_gift_usdc: None,
        storage_paid: u.storage_paid,
        storage_invoice_id: None,
        storage_credits_gib: u.storage_credits_gib,
        comms_credits: u.comms_credits,
        access_token: Some(token.clone()),
        role: u.role,
    };
    GatewayAuthResult { user, access_token: token }
}
