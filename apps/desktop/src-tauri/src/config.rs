use std::env;

#[derive(Debug, Clone)]
pub struct PayphoneConfig {
    pub btcpay_url: String,
    pub btcpay_api_key: String,
    pub btcpay_store_id: String,
    pub api_gateway_url: String,
    pub escrow_engine_url: String,
}

impl PayphoneConfig {
    pub fn from_env() -> Self {
        Self {
            btcpay_url: env::var("PAYPHONE_BTCPAY_URL")
                .unwrap_or_else(|_| "http://localhost:49392".into()),
            btcpay_api_key: env::var("PAYPHONE_BTCPAY_API_KEY").unwrap_or_default(),
            btcpay_store_id: env::var("PAYPHONE_BTCPAY_STORE_ID").unwrap_or_default(),
            api_gateway_url: env::var("PAYPHONE_API_GATEWAY_URL")
                .unwrap_or_else(|_| "http://localhost:4000".into()),
            escrow_engine_url: env::var("PAYPHONE_ESCROW_ENGINE_URL")
                .unwrap_or_else(|_| "http://localhost:4004".into()),
        }
    }

    pub fn btcpay_configured(&self) -> bool {
        !self.btcpay_api_key.is_empty() && !self.btcpay_store_id.is_empty()
    }
}
