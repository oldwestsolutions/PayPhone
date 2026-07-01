use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskedCallRequest {
    pub stellar_username: String,
    pub circle_wallet_id: String,
    pub masked_from: String,
    pub to_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskedCallResponse {
    pub session_id: String,
    pub masked_from: String,
    pub status: String,
    pub message: String,
}

/// Deterministic masked line per Stellar username (never the user's real mobile).
pub fn derive_masked_number(username: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(username.as_bytes());
    let hash = hasher.finalize();
    let a = u16::from_be_bytes([hash[0], hash[1]]) % 900 + 100;
    let b = u16::from_be_bytes([hash[2], hash[3]]) % 10000;
    format!("+1 (555) {a:03}-{b:04}")
}

pub struct MaskProxyClient {
    base_url: String,
    client: reqwest::Client,
}

impl MaskProxyClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    pub fn from_env() -> Self {
        let url = std::env::var("PAYPHONE_MASK_PROXY_URL")
            .unwrap_or_else(|_| "http://localhost:4010".into());
        Self::new(url)
    }

    pub async fn health(&self) -> bool {
        let url = format!("{}/health", self.base_url.trim_end_matches('/'));
        self.client
            .get(&url)
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    /// Route outbound call through Payphone reverse proxy — callee sees masked_from only.
    pub async fn initiate_masked_call(
        &self,
        req: &MaskedCallRequest,
    ) -> Result<MaskedCallResponse, String> {
        let url = format!("{}/v1/calls/masked", self.base_url.trim_end_matches('/'));
        let resp = self
            .client
            .post(&url)
            .json(req)
            .send()
            .await
            .map_err(|e| format!("Mask proxy unreachable: {e}"))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Mask proxy rejected call: {body}"));
        }

        resp.json()
            .await
            .map_err(|e| format!("Invalid mask proxy response: {e}"))
    }

    /// Local simulation when proxy is offline — models the masking contract for demo builds.
    pub fn simulate_masked_call(req: &MaskedCallRequest) -> MaskedCallResponse {
        MaskedCallResponse {
            session_id: format!("mask-demo-{}", chrono_now()),
            masked_from: req.masked_from.clone(),
            status: "connected".into(),
            message: format!(
                "Masked call active. Callee sees {} — your real number is hidden via Payphone proxy.",
                req.masked_from
            ),
        }
    }
}

fn chrono_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
