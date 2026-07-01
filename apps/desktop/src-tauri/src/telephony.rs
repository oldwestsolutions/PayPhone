use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhoneLineConfig {
    pub stellar_name: String,
    pub personal_phone: String,
    pub account_type: String,
    pub call_toll_usdc: Option<f64>,
    pub sms_toll_usdc: Option<f64>,
    pub message_gift_usdc: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NameCallRequest {
    pub from_name: String,
    pub to_name: String,
    pub circle_wallet_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallSession {
    pub session_id: String,
    pub from_name: String,
    pub to_name: String,
    pub caller_id_shown: String,
    pub status: String,
    pub bridge_from: String,
    pub bridge_to: String,
    pub min_billable_seconds: i32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndCallResult {
    pub session: CallSession,
    pub billable_seconds: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmsMessage {
    pub id: String,
    pub from_name: String,
    pub to_name: String,
    pub body: String,
    pub sent_at: i64,
    pub gift_usdc: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendSmsRequest {
    pub from_name: String,
    pub to_name: String,
    pub body: String,
    pub gift_usdc: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: String,
    pub owner_name: String,
    pub title: String,
    pub starts_at: i64,
    pub ends_at: i64,
    pub with_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TelephonyEnvelope<T> {
    ok: bool,
    data: Option<T>,
    error: Option<String>,
}

pub struct TelephonyEngineClient {
    base_url: String,
    client: reqwest::Client,
}

impl TelephonyEngineClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    pub fn from_env() -> Self {
        let url = std::env::var("PAYPHONE_TELEPHONY_ENGINE_URL")
            .or_else(|_| std::env::var("PAYPHONE_MASK_PROXY_URL"))
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

    pub async fn register_phone(&self, config: &PhoneLineConfig) -> Result<PhoneLineConfig, String> {
        let url = format!("{}/v1/phones/register", self.base_url.trim_end_matches('/'));
        self.post(&url, config).await
    }

    pub async fn initiate_name_call(&self, req: &NameCallRequest) -> Result<CallSession, String> {
        let url = format!("{}/v1/calls/name", self.base_url.trim_end_matches('/'));
        self.post(&url, req).await
    }

    pub async fn end_call(&self, session_id: &str, duration_seconds: i32) -> Result<EndCallResult, String> {
        let url = format!(
            "{}/v1/calls/{}/end",
            self.base_url.trim_end_matches('/'),
            session_id
        );
        self.post(&url, &serde_json::json!({ "durationSeconds": duration_seconds }))
            .await
    }

    pub async fn send_sms(&self, req: &SendSmsRequest) -> Result<SmsMessage, String> {
        let url = format!("{}/v1/sms/send", self.base_url.trim_end_matches('/'));
        self.post(&url, req).await
    }

    pub async fn list_sms(&self, stellar_name: &str) -> Result<Vec<SmsMessage>, String> {
        let url = format!(
            "{}/v1/sms/{}",
            self.base_url.trim_end_matches('/'),
            stellar_name
        );
        self.get(&url).await
    }

    pub async fn create_event(&self, event: &CalendarEvent) -> Result<CalendarEvent, String> {
        let url = format!("{}/v1/calendar", self.base_url.trim_end_matches('/'));
        let body = serde_json::json!({
            "ownerName": event.owner_name,
            "title": event.title,
            "startsAt": event.starts_at,
            "endsAt": event.ends_at,
            "withName": event.with_name,
        });
        self.post_raw(&url, body).await
    }

    pub async fn list_calendar(&self, stellar_name: &str) -> Result<Vec<CalendarEvent>, String> {
        let url = format!(
            "{}/v1/calendar/{}",
            self.base_url.trim_end_matches('/'),
            stellar_name
        );
        self.get(&url).await
    }

    async fn post<T: for<'de> Deserialize<'de>>(
        &self,
        url: &str,
        body: &impl Serialize,
    ) -> Result<T, String> {
        let resp = self
            .client
            .post(url)
            .json(body)
            .send()
            .await
            .map_err(|e| format!("Telephony engine unreachable: {e}"))?;
        self.decode(resp).await
    }

    async fn post_raw<T: for<'de> Deserialize<'de>>(
        &self,
        url: &str,
        body: serde_json::Value,
    ) -> Result<T, String> {
        let resp = self
            .client
            .post(url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Telephony engine unreachable: {e}"))?;
        self.decode(resp).await
    }

    async fn get<T: for<'de> Deserialize<'de>>(&self, url: &str) -> Result<T, String> {
        let resp = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Telephony engine unreachable: {e}"))?;
        self.decode(resp).await
    }

    async fn decode<T: for<'de> Deserialize<'de>>(
        &self,
        resp: reqwest::Response,
    ) -> Result<T, String> {
        let envelope: TelephonyEnvelope<T> = resp
            .json()
            .await
            .map_err(|e| format!("Invalid telephony response: {e}"))?;
        if envelope.ok {
            envelope.data.ok_or_else(|| "Empty telephony response".into())
        } else {
            Err(envelope.error.unwrap_or_else(|| "Telephony error".into()))
        }
    }

    /// Offline fallback when Haskell engine is down.
    pub fn simulate_name_call(req: &NameCallRequest) -> CallSession {
        CallSession {
            session_id: format!("local-{}", now()),
            from_name: req.from_name.clone(),
            to_name: req.to_name.clone(),
            caller_id_shown: "RESTRICTED".into(),
            status: "Connected".into(),
            bridge_from: "local".into(),
            bridge_to: "local".into(),
            min_billable_seconds: 60,
            message: format!(
                "Name-to-name call to @{}. Callee sees RESTRICTED.",
                req.to_name
            ),
        }
    }
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Deterministic masked line per Stellar username (display only — calls show RESTRICTED).
pub fn derive_masked_number(username: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(username.as_bytes());
    let hash = hasher.finalize();
    let a = u16::from_be_bytes([hash[0], hash[1]]) % 900 + 100;
    let b = u16::from_be_bytes([hash[2], hash[3]]) % 10000;
    format!("+1 (555) {a:03}-{b:04}")
}
