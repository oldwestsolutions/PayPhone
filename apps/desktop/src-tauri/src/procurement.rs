use crate::models::ProgrammableCommitment;
use serde::Deserialize;

pub struct ProcurementClient {
    gateway_url: String,
}

#[derive(Debug, Deserialize)]
struct CommitmentList {
    data: Vec<ProgrammableCommitment>,
}

#[derive(Debug, Deserialize)]
struct CommitmentOne {
    data: ProgrammableCommitment,
}

impl ProcurementClient {
    pub fn new(gateway_url: String) -> Self {
        Self { gateway_url }
    }

    pub async fn list(&self, party: &str) -> Result<Vec<ProgrammableCommitment>, String> {
        let url = format!(
            "{}/api/procurement/commitments?party={}",
            self.gateway_url.trim_end_matches('/'),
            party
        );
        let resp = reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Ok(vec![]);
        }
        let parsed: CommitmentList = resp.json().await.map_err(|e| e.to_string())?;
        Ok(parsed.data)
    }

    pub async fn create(
        &self,
        buyer_id: &str,
        supplier_id: &str,
        total_amount: f64,
        buyer_balance: f64,
        line_items: serde_json::Value,
        milestones: serde_json::Value,
    ) -> Result<ProgrammableCommitment, String> {
        let url = format!(
            "{}/api/procurement/commitments",
            self.gateway_url.trim_end_matches('/')
        );
        let body = serde_json::json!({
            "buyerId": buyer_id,
            "supplierId": supplier_id,
            "totalAmount": total_amount,
            "buyerBalance": buyer_balance,
            "lineItems": line_items,
            "milestones": milestones,
        });
        let resp = reqwest::Client::new()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let msg = resp.text().await.unwrap_or_default();
            return Err(msg);
        }
        let parsed: CommitmentOne = resp.json().await.map_err(|e| e.to_string())?;
        Ok(parsed.data)
    }

    pub async fn fund(
        &self,
        commitment_id: &str,
        wallet_id: &str,
        amount: f64,
        requester_id: &str,
    ) -> Result<ProgrammableCommitment, String> {
        let url = format!(
            "{}/api/procurement/commitments/{}/fund",
            self.gateway_url.trim_end_matches('/'),
            commitment_id
        );
        let body = serde_json::json!({
            "walletId": wallet_id,
            "amount": format!("{amount:.2}"),
            "requesterId": requester_id,
        });
        let resp = reqwest::Client::new()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let msg = resp.text().await.unwrap_or_default();
            return Err(msg);
        }
        #[derive(Deserialize)]
        struct FundResp {
            data: FundData,
        }
        #[derive(Deserialize)]
        struct FundData {
            commitment: ProgrammableCommitment,
        }
        let parsed: FundResp = resp.json().await.map_err(|e| e.to_string())?;
        Ok(parsed.data.commitment)
    }

    pub async fn transition(
        &self,
        commitment_id: &str,
        request_type: &str,
        requester_id: &str,
        milestone_id: Option<&str>,
    ) -> Result<ProgrammableCommitment, String> {
        let url = format!(
            "{}/api/procurement/commitments/{}/transition",
            self.gateway_url.trim_end_matches('/'),
            commitment_id
        );
        let mut body = serde_json::json!({
            "requestType": request_type,
            "requesterId": requester_id,
        });
        if let Some(mid) = milestone_id {
            body["milestoneId"] = serde_json::Value::String(mid.to_string());
        }
        let resp = reqwest::Client::new()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let msg = resp.text().await.unwrap_or_default();
            return Err(msg);
        }
        let parsed: CommitmentOne = resp.json().await.map_err(|e| e.to_string())?;
        Ok(parsed.data)
    }

    pub async fn release_milestone(
        &self,
        commitment_id: &str,
        milestone_id: &str,
        recipient_address: &str,
        requester_id: &str,
    ) -> Result<ProgrammableCommitment, String> {
        let url = format!(
            "{}/api/procurement/commitments/{}/release-milestone",
            self.gateway_url.trim_end_matches('/'),
            commitment_id
        );
        let body = serde_json::json!({
            "milestoneId": milestone_id,
            "recipientAddress": recipient_address,
            "requesterId": requester_id,
            "fromParty": requester_id,
        });
        let resp = reqwest::Client::new()
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let msg = resp.text().await.unwrap_or_default();
            return Err(msg);
        }
        #[derive(Deserialize)]
        struct ReleaseResp {
            data: ReleaseData,
        }
        #[derive(Deserialize)]
        struct ReleaseData {
            commitment: ProgrammableCommitment,
        }
        let parsed: ReleaseResp = resp.json().await.map_err(|e| e.to_string())?;
        Ok(parsed.data.commitment)
    }
}
