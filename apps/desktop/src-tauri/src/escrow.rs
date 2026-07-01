use crate::models::{EscrowContract, MarketingEscrow, SupplyChainEscrow, TransitionRequest, TransitionResponse};
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
        if contract.buyer_balance < contract.amount {
            return Err("Insufficient wallet balance to back this escrow.".into());
        }
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
            ("Active", "settle_call") if ok_party(&request.requester_id) => c.status = "Settled".into(),
            ("Active", "dispute") if ok_party(&request.requester_id) => c.status = "Disputed".into(),
            ("Draft", "cancel") => c.status = "Cancelled".into(),
            ("Funded", "cancel") if request.requester_id == c.buyer_id => {
                c.status = "Cancelled".into()
            }
            (s, t) => return Err(format!("Invalid transition '{t}' from {s}")),
        }
        Ok(c)
    }

    pub async fn create_marketing(&self, escrow: &MarketingEscrow) -> Result<MarketingEscrow, String> {
        let url = format!("{}/marketing", self.base_url.trim_end_matches('/'));
        let body = serde_json::json!({
            "marketingId": escrow.marketing_id,
            "brandId": escrow.brand_id,
            "creatorId": escrow.creator_id,
            "campaignName": escrow.campaign_name,
            "amount": escrow.amount,
            "buyerBalance": escrow.buyer_balance,
        });
        self.post_json(&url, body).await
    }

    pub async fn transition_marketing(
        &self,
        marketing_id: &str,
        request: &TransitionRequest,
    ) -> Result<MarketingEscrow, String> {
        let url = format!(
            "{}/marketing/{}/transition",
            self.base_url.trim_end_matches('/'),
            marketing_id
        );
        self.post_json(&url, serde_json::to_value(request).map_err(|e| e.to_string())?).await
    }

    pub async fn create_supply(&self, escrow: &SupplyChainEscrow) -> Result<SupplyChainEscrow, String> {
        let url = format!("{}/supply-chain", self.base_url.trim_end_matches('/'));
        let body = serde_json::json!({
            "supplyId": escrow.supply_id,
            "buyerId": escrow.buyer_id,
            "supplierId": escrow.supplier_id,
            "sku": escrow.sku,
            "quantity": escrow.quantity,
            "amount": escrow.amount,
            "buyerBalance": escrow.buyer_balance,
        });
        self.post_json(&url, body).await
    }

    pub async fn transition_supply(
        &self,
        supply_id: &str,
        request: &TransitionRequest,
    ) -> Result<SupplyChainEscrow, String> {
        let url = format!(
            "{}/supply-chain/{}/transition",
            self.base_url.trim_end_matches('/'),
            supply_id
        );
        self.post_json(&url, serde_json::to_value(request).map_err(|e| e.to_string())?).await
    }

    async fn post_json<T: for<'de> Deserialize<'de>>(
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
            .map_err(|e| format!("Escrow engine unreachable: {e}"))?;
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(if text.is_empty() {
                "Escrow request failed".into()
            } else {
                text
            });
        }
        resp.json::<T>()
            .await
            .map_err(|e| format!("Invalid escrow response: {e}"))
    }
}
