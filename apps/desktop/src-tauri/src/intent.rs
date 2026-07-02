use serde_json::Value;
use tauri::State;

use crate::AppState;

async fn gateway_post(
    state: &AppState,
    path: &str,
    payload: Value,
) -> Result<Value, String> {
    let token = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .and_then(|u| u.access_token.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };
    let url = format!(
        "{}{}",
        state.config.api_gateway_url.trim_end_matches('/'),
        path
    );
    let resp = reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {token}"))
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    let body: Value = resp.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(
            body["error"]
                .as_str()
                .or_else(|| body.get("message").and_then(|m| m.as_str()))
                .unwrap_or("Gateway error")
                .to_string(),
        );
    }
    Ok(body)
}

async fn gateway_get(state: &AppState, path: &str) -> Result<Value, String> {
    let token = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .and_then(|u| u.access_token.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };
    let url = format!(
        "{}{}",
        state.config.api_gateway_url.trim_end_matches('/'),
        path
    );
    let resp = reqwest::Client::new()
        .get(&url)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    let body: Value = resp.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(body["error"].as_str().unwrap_or("Gateway error").into());
    }
    Ok(body)
}

#[tauri::command]
pub async fn submit_intent(
    state: State<'_, AppState>,
    asset_in: String,
    amount_in: String,
    asset_out: String,
    recipient: Option<String>,
    purpose: String,
    urgency: String,
) -> Result<Value, String> {
    let username = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };
    let body = gateway_post(
        &state,
        "/api/intent/submit",
        serde_json::json!({
            "rawAssetIn": asset_in,
            "rawAmountIn": amount_in,
            "rawAssetOut": asset_out,
            "rawRecipient": recipient,
            "rawPurpose": purpose,
            "rawUrgency": urgency,
            "rawSubmittedBy": username,
        }),
    )
    .await?;
    Ok(body["data"].clone())
}

#[tauri::command]
pub async fn get_route(state: State<'_, AppState>, intent_id: String) -> Result<Value, String> {
    let body = gateway_post(
        &state,
        "/api/routes/evaluate",
        serde_json::json!({ "intentId": intent_id }),
    )
    .await?;
    Ok(body["data"].clone())
}

#[tauri::command]
pub async fn confirm_execution(
    state: State<'_, AppState>,
    route_plan_id: String,
) -> Result<Value, String> {
    let body = gateway_post(
        &state,
        "/api/execute",
        serde_json::json!({
            "routePlanId": route_plan_id,
            "userConfirmation": true,
        }),
    )
    .await?;
    Ok(body["data"].clone())
}

#[tauri::command]
pub async fn get_execution_status(
    state: State<'_, AppState>,
    execution_id: String,
) -> Result<Value, String> {
    let body = gateway_get(&state, &format!("/api/execute/{execution_id}")).await?;
    Ok(body["data"].clone())
}

#[tauri::command]
pub async fn get_supported_asset_pairs(state: State<'_, AppState>) -> Result<Value, String> {
    let url = format!(
        "{}/api/intent/supported-pairs",
        state.config.api_gateway_url.trim_end_matches('/')
    );
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let body: Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(body["data"].clone())
}

#[tauri::command]
pub async fn get_ledger_chain(
    state: State<'_, AppState>,
    intent_id: String,
) -> Result<Value, String> {
    let body = gateway_get(&state, &format!("/api/ledger/intent/{intent_id}")).await?;
    Ok(body["data"].clone())
}
