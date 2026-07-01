use crate::models::{EscrowContract, TransitionRequest, TransitionResponse};
use serde::Deserialize;

pub struct EscrowEngineClient {
    base_url: String,
    client: reqwest::Client,
}

#[derive(Debug, Deserialize)]
struct HealthResponse {
    ok: bool,
}

impl EscrowEngineClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn health(&self) -> bool {
        let url = format!("{}/health", self.base_url.trim_end_matches('/'));
        match self.client.get(&url).send().await {
            Ok(r) => r.json::<HealthResponse>().await.map(|h| h.ok).unwrap_or(false),
            Err(_) => false,
        }
    }

    pub async fn create_contract(&self, contract: &EscrowContract) -> Result<EscrowContract, String> {
        let url = format!("{}/contracts", self.base_url.trim_end_matches('/'));
        let resp = self
            .client
            .post(&url)
            .json(contract)
            .send()
            .await
            .map_err(|e| format!("Escrow engine unreachable: {e}"))?;

        let body: TransitionResponse = resp
            .json()
            .await
            .map_err(|e| format!("Invalid escrow response: {e}"))?;

        if let Some(err) = body.error {
            return Err(err);
        }
        body.contract.ok_or_else(|| "No contract returned".into())
    }

    pub async fn get_contract(&self, contract_id: &str) -> Result<EscrowContract, String> {
        let url = format!(
            "{}/contracts/{}",
            self.base_url.trim_end_matches('/'),
            contract_id
        );
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Escrow engine unreachable: {e}"))?;

        let body: TransitionResponse = resp
            .json()
            .await
            .map_err(|e| format!("Invalid escrow response: {e}"))?;
        body.contract.ok_or_else(|| "Contract not found".into())
    }

    pub async fn transition(
        &self,
        contract_id: &str,
        request: TransitionRequest,
    ) -> Result<EscrowContract, String> {
        let url = format!(
            "{}/contracts/{}/transition",
            self.base_url.trim_end_matches('/'),
            contract_id
        );
        let resp = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Escrow engine unreachable: {e}"))?;

        let body: TransitionResponse = resp
            .json()
            .await
            .map_err(|e| format!("Invalid escrow response: {e}"))?;

        if let Some(err) = body.error {
            return Err(err);
        }
        body.contract.ok_or_else(|| "Transition failed".into())
    }

    /// Local fallback when Haskell service is offline (same rules).
    pub fn local_transition(
        contract: &EscrowContract,
        request: &TransitionRequest,
    ) -> Result<EscrowContract, String> {
        let mut c = contract.clone();
        let ok_party = |id: &str| id == c.buyer_id || id == c.seller_id;
        match (c.status.as_str(), request.request_type.as_str()) {
            ("Draft", "fund") if request.requester_id == c.buyer_id => c.status = "Funded".into(),
            ("Funded", "activate") if ok_party(&request.requester_id) => c.status = "Active".into(),
            ("Active", "request_release") if request.requester_id == c.seller_id => {
                c.status = "ReleasePending".into()
            }
            ("ReleasePending", "settle") if request.requester_id == c.buyer_id => {
                c.status = "Settled".into()
            }
            ("Active", "dispute") if ok_party(&request.requester_id) => c.status = "Disputed".into(),
            ("Draft", "cancel") => c.status = "Cancelled".into(),
            ("Funded", "cancel") if request.requester_id == c.buyer_id => {
                c.status = "Cancelled".into()
            }
            (s, t) => return Err(format!("Invalid transition '{t}' from {s}")),
        }
        Ok(c)
    }
}
