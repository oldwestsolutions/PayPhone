use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAccount {
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub stellar_public_key: String,
    pub stellar_secret: String,
    pub circle_wallet_id: String,
    pub circle_wallet_address: String,
    pub masked_number: String,
    #[serde(default)]
    pub storage_paid: bool,
    pub storage_invoice_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicUser {
    pub username: String,
    pub email: String,
    pub stellar_public_key: String,
    pub circle_wallet_address: String,
    pub masked_number: String,
    #[serde(default)]
    pub storage_paid: bool,
}

impl From<UserAccount> for PublicUser {
    fn from(u: UserAccount) -> Self {
        Self {
            username: u.username,
            email: u.email,
            stellar_public_key: u.stellar_public_key,
            circle_wallet_address: u.circle_wallet_address,
            masked_number: u.masked_number,
            storage_paid: u.storage_paid,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterResult {
    pub username: String,
    pub stellar_public_key: String,
    pub circle_wallet_address: String,
    pub masked_number: String,
    #[serde(default)]
    pub storage_paid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub name: String,
    pub number: String,
    pub company: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallRecord {
    pub id: String,
    pub number: String,
    pub direction: String,
    pub status: String,
    pub started_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BtcPayInvoice {
    pub id: String,
    pub checkout_link: String,
    pub amount: String,
    pub currency: String,
    pub status: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingStatus {
    pub btcpay_configured: bool,
    pub btcpay_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaceCallResult {
    pub record: CallRecord,
    pub telephony_available: bool,
    pub message: String,
    pub masked_caller_id: String,
    pub session_id: String,
    pub connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsernameRules {
    pub min_length: usize,
    pub max_length: usize,
    pub requires_digit: bool,
    pub example: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StellarIdentity {
    pub public_key: String,
    pub secret_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircleWallet {
    pub wallet_id: String,
    pub address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowContract {
    pub contract_id: String,
    pub buyer_id: String,
    pub seller_id: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionRequest {
    #[serde(rename = "requestType")]
    pub request_type: String,
    #[serde(rename = "requesterId")]
    pub requester_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionResponse {
    pub contract: Option<EscrowContract>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub calls_count: usize,
    pub contacts_count: usize,
    pub escrows_active: usize,
    pub escrow_engine_online: bool,
}
