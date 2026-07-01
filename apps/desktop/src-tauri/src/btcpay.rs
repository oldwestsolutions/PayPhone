use crate::models::BtcPayInvoice;
use serde::{Deserialize, Serialize};

pub struct BtcPayClient {
    base_url: String,
    api_key: String,
    store_id: String,
    client: reqwest::Client,
}

#[derive(Serialize)]
struct CreateInvoiceRequest {
    amount: String,
    currency: String,
    metadata: InvoiceMetadata,
}

#[derive(Serialize)]
struct InvoiceMetadata {
    #[serde(rename = "orderId")]
    order_id: String,
    product: String,
}

#[derive(Debug, Deserialize)]
struct BtcPayInvoiceResponse {
    id: String,
    #[serde(rename = "checkoutLink")]
    checkout_link: String,
    amount: String,
    currency: String,
    status: String,
}

#[derive(Debug, Deserialize)]
struct BtcPayInvoiceStatusResponse {
    status: String,
}

pub const STORAGE_PLAN_USD: &str = "9.99";
const STORAGE_DESCRIPTION: &str = "1 GB secure storage — contacts & call history";

impl BtcPayClient {
    pub fn new(base_url: String, api_key: String, store_id: String) -> Self {
        Self {
            base_url,
            api_key,
            store_id,
            client: reqwest::Client::new(),
        }
    }

    fn invoice_url(&self, invoice_id: Option<&str>) -> String {
        let base = format!(
            "{}/api/v1/stores/{}/invoices",
            self.base_url.trim_end_matches('/'),
            self.store_id
        );
        match invoice_id {
            Some(id) => format!("{base}/{id}"),
            None => base,
        }
    }

    /// 1 GB secure storage activation — contacts and call history unlock after payment.
    pub async fn create_storage_invoice(&self, username: &str) -> Result<BtcPayInvoice, String> {
        let body = CreateInvoiceRequest {
            amount: STORAGE_PLAN_USD.into(),
            currency: "USD".into(),
            metadata: InvoiceMetadata {
                order_id: format!("storage-1gb-{username}"),
                product: "Payphone 1GB Storage".into(),
            },
        };

        let resp = self
            .client
            .post(self.invoice_url(None))
            .header("Authorization", format!("token {}", self.api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("BTCPayServer unreachable: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("BTCPayServer returned {status}: {body}"));
        }

        let inv: BtcPayInvoiceResponse = resp
            .json()
            .await
            .map_err(|e| format!("Invalid BTCPay response: {e}"))?;

        Ok(BtcPayInvoice {
            id: inv.id,
            checkout_link: inv.checkout_link,
            amount: inv.amount,
            currency: inv.currency,
            status: inv.status,
            description: STORAGE_DESCRIPTION.into(),
        })
    }

    /// Returns true when invoice is paid (Settled) or payment detected (Processing).
    pub async fn is_invoice_paid(&self, invoice_id: &str) -> Result<bool, String> {
        let resp = self
            .client
            .get(self.invoice_url(Some(invoice_id)))
            .header("Authorization", format!("token {}", self.api_key))
            .send()
            .await
            .map_err(|e| format!("BTCPayServer unreachable: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("BTCPayServer returned {status}: {body}"));
        }

        let inv: BtcPayInvoiceStatusResponse = resp
            .json()
            .await
            .map_err(|e| format!("Invalid BTCPay response: {e}"))?;

        Ok(matches!(
            inv.status.as_str(),
            "Settled" | "Processing" | "Paid"
        ))
    }
}
