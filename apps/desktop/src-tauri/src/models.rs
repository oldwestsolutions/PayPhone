use serde::{Deserialize, Serialize};

fn default_account_type() -> String {
    "consumer".into()
}

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
    pub personal_phone: String,
    #[serde(default = "default_account_type")]
    pub account_type: String,
    #[serde(default)]
    pub call_toll_usdc: Option<f64>,
    #[serde(default)]
    pub sms_toll_usdc: Option<f64>,
    #[serde(default)]
    pub message_gift_usdc: Option<f64>,
    #[serde(default)]
    pub storage_paid: bool,
    pub storage_invoice_id: Option<String>,
    #[serde(default)]
    pub storage_credits_gib: f64,
    #[serde(default)]
    pub comms_credits: f64,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub access_token: Option<String>,
    #[serde(default = "default_role")]
    pub role: String,
}

fn default_role() -> String {
    "user".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicUser {
    pub username: String,
    pub email: String,
    pub stellar_public_key: String,
    pub circle_wallet_address: String,
    pub masked_number: String,
    #[serde(default)]
    pub personal_phone: String,
    #[serde(default = "default_account_type")]
    pub account_type: String,
    #[serde(default)]
    pub storage_paid: bool,
    #[serde(default)]
    pub storage_credits_gib: f64,
    #[serde(default)]
    pub comms_credits: f64,
    #[serde(default)]
    pub phone: String,
    #[serde(default = "default_role")]
    pub role: String,
    #[serde(default)]
    pub access_token: Option<String>,
}

impl From<UserAccount> for PublicUser {
    fn from(u: UserAccount) -> Self {
        Self {
            username: u.username,
            email: u.email,
            stellar_public_key: u.stellar_public_key,
            circle_wallet_address: u.circle_wallet_address,
            masked_number: u.masked_number,
            personal_phone: u.personal_phone.clone(),
            account_type: u.account_type.clone(),
            storage_paid: u.storage_paid,
            storage_credits_gib: u.storage_credits_gib,
            comms_credits: u.comms_credits,
            phone: u.phone.clone(),
            role: u.role.clone(),
            access_token: u.access_token.clone(),
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
    pub peer_name: String,
    pub direction: String,
    pub status: String,
    pub caller_id_shown: String,
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
    pub caller_id_shown: String,
    pub session_id: String,
    pub connected: bool,
    #[serde(default)]
    pub to_dial_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketingEscrow {
    pub marketing_id: String,
    pub brand_id: String,
    pub creator_id: String,
    pub campaign_name: String,
    pub amount: f64,
    pub status: String,
    pub buyer_balance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SupplyChainEscrow {
    pub supply_id: String,
    pub buyer_id: String,
    pub supplier_id: String,
    pub sku: String,
    pub quantity: i32,
    pub amount: f64,
    pub status: String,
    pub buyer_balance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditPurchaseResult {
    pub usdc_paid: f64,
    pub storage_gib_months: f64,
    pub comms_units: f64,
    pub tx_ref: String,
    pub solidity_contract: String,
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
pub struct CircleBalance {
    pub token_id: Option<String>,
    pub symbol: String,
    pub amount: String,
    pub blockchain: Option<String>,
    pub token_address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircleTransferResult {
    pub id: String,
    pub state: String,
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
    #[serde(default)]
    pub circle_fund_tx_id: Option<String>,
    #[serde(default)]
    pub buyer_balance: f64,
    #[serde(default = "default_min_billable")]
    pub min_billable_seconds: i32,
    #[serde(default)]
    pub rate_per_second: f64,
    #[serde(default)]
    pub call_session_id: Option<String>,
}

fn default_min_billable() -> i32 {
    60
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionRequest {
    #[serde(rename = "requestType")]
    pub request_type: String,
    #[serde(rename = "requesterId")]
    pub requester_id: String,
    #[serde(rename = "durationSeconds", default)]
    pub duration_seconds: Option<i32>,
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
    pub telephony_engine_online: bool,
    pub personal_phone_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ProcurementMilestone {
    pub id: String,
    pub name: String,
    pub release_pct: f64,
    #[serde(default)]
    pub release_amount: f64,
    pub condition: String,
    pub status: String,
    #[serde(default)]
    pub completed_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ProgrammableCommitment {
    pub commitment_id: String,
    pub buyer_id: String,
    pub supplier_id: String,
    #[serde(default)]
    pub line_items: Vec<serde_json::Value>,
    pub total_amount: f64,
    pub currency: String,
    pub milestones: Vec<ProcurementMilestone>,
    pub status: String,
    #[serde(default)]
    pub released_total: f64,
    #[serde(default)]
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformRevenue {
    pub month_total_usdc: f64,
    pub all_time_total_usdc: f64,
    #[serde(default)]
    pub by_type: std::collections::HashMap<String, f64>,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformWallet {
    pub simulated: bool,
    pub wallet_id: Option<String>,
    pub address: Option<String>,
    pub usdc_balance: String,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendUsdcResult {
    pub transaction_id: String,
    pub amount_sent: f64,
    pub recipient_amount: f64,
    pub platform_fee: f64,
    pub simulated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettlementResult {
    pub seller_amount: f64,
    pub platform_fee: f64,
    pub refund_amount: f64,
    pub simulated: bool,
}

