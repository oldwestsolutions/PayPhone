mod account;
mod btcpay;
mod circle_client;
mod config;
mod escrow;
mod models;
mod stellar_client;
mod telephony;
mod wallet;

use std::env;
use std::sync::Mutex;
use account::{load_store, now_unix, AccountStore};
use btcpay::BtcPayClient;
use config::PayphoneConfig;
use escrow::EscrowEngineClient;
use models::{
    BillingStatus, BtcPayInvoice, CallRecord, Contact, DashboardStats, EscrowContract,
    PlaceCallResult, PublicUser, RegisterResult, TransitionRequest, UsernameRules,
};
use telephony::{
    derive_masked_number, CalendarEvent, NameCallRequest, PhoneLineConfig, SendSmsRequest,
    TelephonyEngineClient,
};
use wallet::WalletSummary;
use tauri::State;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

struct AppState {
    store: Mutex<AccountStore>,
    config: PayphoneConfig,
}

impl AppState {
    fn from_env() -> Self {
        Self {
            store: Mutex::new(AccountStore::default()),
            config: PayphoneConfig::from_env(),
        }
    }

    fn btcpay_client(&self) -> Result<BtcPayClient, String> {
        if !self.config.btcpay_configured() {
            return Err(
                "BTCPayServer is not configured. Set PAYPHONE_BTCPAY_API_KEY and PAYPHONE_BTCPAY_STORE_ID."
                    .into(),
            );
        }
        Ok(BtcPayClient::new(
            self.config.btcpay_url.clone(),
            self.config.btcpay_api_key.clone(),
            self.config.btcpay_store_id.clone(),
        ))
    }
}

fn with_store<F, T>(state: &AppState, f: F) -> Result<T, String>
where
    F: FnOnce(&mut AccountStore) -> Result<T, String>,
{
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    f(&mut store)
}

fn is_demo_mode() -> bool {
    env::var("PAYPHONE_DEMO_MODE")
        .map(|v| v != "false" && v != "0")
        .unwrap_or(true)
}

fn migrate_user_fields(user: &mut models::UserAccount) {
    if user.masked_number.is_empty() {
        user.masked_number = derive_masked_number(&user.username);
    }
}

async fn build_user(
    state: &AppState,
    username: String,
    email: String,
    password: String,
) -> Result<models::UserAccount, String> {
    let stellar = stellar_client::register_username(&username)?;
    let wallet = circle_client::create_wallet(&state.config.api_gateway_url, &username).await?;
    let masked_number = derive_masked_number(&username);
    Ok(models::UserAccount {
        username,
        email,
        password_hash: account::hash_password(&password),
        stellar_public_key: stellar.public_key,
        stellar_secret: stellar.secret_key,
        circle_wallet_id: wallet.wallet_id,
        circle_wallet_address: wallet.address,
        masked_number,
        personal_phone: String::new(),
        account_type: "consumer".into(),
        call_toll_usdc: None,
        sms_toll_usdc: None,
        message_gift_usdc: None,
        storage_paid: is_demo_mode(),
        storage_invoice_id: None,
    })
}

/// Demo login: any username/password — Stellar keys stay pending until username passes validation.
async fn build_user_loose(
    state: &AppState,
    username: String,
    password: String,
) -> Result<models::UserAccount, String> {
    let wallet = circle_client::create_wallet(&state.config.api_gateway_url, &username).await?;
    let masked_number = derive_masked_number(&username);
    let (public_key, secret) = if stellar_client::validate_stellar_username(&username).is_ok() {
        let stellar = stellar_client::register_username(&username)?;
        (stellar.public_key, stellar.secret_key)
    } else {
        (
            format!("G_PENDING_{}", hex::encode(username.as_bytes())),
            "S_PENDING".into(),
        )
    };
    Ok(models::UserAccount {
        username: username.clone(),
        email: format!("{username}@payphone.local"),
        password_hash: account::hash_password(&password),
        stellar_public_key: public_key,
        stellar_secret: secret,
        circle_wallet_id: wallet.wallet_id,
        circle_wallet_address: wallet.address,
        masked_number,
        personal_phone: String::new(),
        account_type: "consumer".into(),
        call_toll_usdc: None,
        sms_toll_usdc: None,
        message_gift_usdc: None,
        storage_paid: is_demo_mode(),
        storage_invoice_id: None,
    })
}

#[tauri::command]
fn get_username_rules() -> UsernameRules {
    UsernameRules {
        min_length: stellar_client::USERNAME_MIN_LEN,
        max_length: stellar_client::USERNAME_MAX_LEN,
        requires_digit: true,
        example: "alex.42line".into(),
    }
}

#[tauri::command]
fn demo_activate_storage(app: tauri::AppHandle, state: State<AppState>) -> Result<PublicUser, String> {
    with_store(&state, |store| {
        let user = store
            .current_user
            .as_mut()
            .ok_or_else(|| "Not signed in".to_string())?;
        user.storage_paid = true;
        store.users.insert(user.username.clone(), user.clone());
        let updated = PublicUser::from(user.clone());
        store.save_to_disk(&app)?;
        Ok(updated)
    })
}

#[tauri::command]
async fn end_call(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let session_id: Option<String> = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store.active_call_session.clone()
    };
    if let Some(sid) = session_id {
        let engine = TelephonyEngineClient::from_env();
        if engine.health().await {
            let _ = engine.end_call(&sid, 0).await;
        }
    }
    with_store(&state, |store| {
        store.active_call_session = None;
        store.save_to_disk(&app)
    })
}

fn normalize_number(number: &str) -> Result<String, String> {
    let digits: String = number.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();
    if digits.len() < 3 {
        return Err("Enter a valid phone number (at least 3 digits).".into());
    }
    Ok(digits)
}

#[tauri::command]
fn get_billing_status(state: State<AppState>) -> BillingStatus {
    BillingStatus {
        btcpay_configured: state.config.btcpay_configured(),
        btcpay_url: state.config.btcpay_url.clone(),
    }
}

#[tauri::command]
fn get_session(state: State<AppState>) -> Result<Option<PublicUser>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    Ok(store.current_user.clone().map(PublicUser::from))
}

#[tauri::command]
async fn register_account(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    username: String,
    email: String,
    password: String,
) -> Result<RegisterResult, String> {
    if state.store.lock().map_err(|e| e.to_string())?.users.contains_key(&username) {
        return Err("That username is already taken.".into());
    }

    let user = build_user(&state, username.clone(), email, password).await?;

    with_store(&state, |store| {
        store.users.insert(username.clone(), user.clone());
        store.current_user = Some(user.clone());
        store.save_to_disk(&app)
    })?;

    Ok(RegisterResult {
        username,
        stellar_public_key: user.stellar_public_key,
        circle_wallet_address: user.circle_wallet_address,
        masked_number: user.masked_number,
        storage_paid: user.storage_paid,
    })
}

#[tauri::command]
async fn login_account(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> Result<PublicUser, String> {
    let exists = state.store.lock().map_err(|e| e.to_string())?.users.contains_key(&username);

    if !exists {
        let user = build_user_loose(&state, username.clone(), password).await?;
        return with_store(&state, |store| {
            store.users.insert(username.clone(), user.clone());
            store.current_user = Some(user.clone());
            store.save_to_disk(&app)?;
            Ok(PublicUser::from(user))
        });
    }

    with_store(&state, |store| {
        let user = store
            .users
            .get_mut(&username)
            .ok_or_else(|| "Account not found.".to_string())?;
        migrate_user_fields(user);
        if !is_demo_mode() && user.password_hash != account::hash_password(&password) {
            return Err("Invalid password".into());
        }
        let snapshot = user.clone();
        store.current_user = Some(snapshot.clone());
        store.save_to_disk(&app)?;
        Ok(PublicUser::from(snapshot))
    })
}

#[tauri::command]
async fn create_storage_invoice(state: State<'_, AppState>) -> Result<BtcPayInvoice, String> {
    let username = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };

    let client = state.btcpay_client()?;
    let invoice = client.create_storage_invoice(&username).await?;

    Ok(invoice)
}

#[tauri::command]
async fn verify_and_activate_storage(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    invoice_id: String,
) -> Result<PublicUser, String> {
    let client = state.btcpay_client()?;
    let paid = client.is_invoice_paid(&invoice_id).await?;
    if !paid {
        return Err(
            "Payment not detected yet. Complete checkout in BTCPay, then try again.".into(),
        );
    }

    with_store(&state, |store| {
        let user = store
            .current_user
            .as_mut()
            .ok_or_else(|| "Not signed in".to_string())?;
        user.storage_paid = true;
        user.storage_invoice_id = Some(invoice_id);
        store.users.insert(user.username.clone(), user.clone());
        let updated = PublicUser::from(user.clone());
        store.save_to_disk(&app)?;
        Ok(updated)
    })
}

#[tauri::command]
async fn place_call_by_name(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    to_name: String,
) -> Result<PlaceCallResult, String> {
    let (username, wallet_id, storage_paid, _personal_phone) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        stellar_client::validate_stellar_username(&user.username).map_err(|e| {
            format!("You cannot place a call without a valid Stellar username. {e}")
        })?;
        if user.personal_phone.is_empty() {
            return Err("Connect your personal phone line in Settings before calling.".into());
        }
        (
            user.username.clone(),
            user.circle_wallet_id.clone(),
            user.storage_paid,
            user.personal_phone.clone(),
        )
    };

    let engine = TelephonyEngineClient::from_env();
    let req = NameCallRequest {
        from_name: username.clone(),
        to_name: to_name.clone(),
        circle_wallet_id: wallet_id,
    };

    let session = if engine.health().await {
        engine.initiate_name_call(&req).await?
    } else {
        TelephonyEngineClient::simulate_name_call(&req)
    };

    let record = CallRecord {
        id: format!("call-{}", now_unix()),
        number: to_name.clone(),
        peer_name: to_name.clone(),
        direction: "outbound".into(),
        status: session.status.clone(),
        caller_id_shown: session.caller_id_shown.clone(),
        started_at: now_unix(),
    };

    with_store(&state, |store| {
        store.active_call_session = Some(session.session_id.clone());
        if storage_paid {
            store
                .call_history_by_user
                .entry(username.clone())
                .or_default()
                .insert(0, record.clone());
        }
        store.save_to_disk(&app)?;
        Ok(())
    })?;

    Ok(PlaceCallResult {
        record,
        telephony_available: true,
        message: session.message,
        masked_caller_id: session.caller_id_shown.clone(),
        caller_id_shown: session.caller_id_shown,
        session_id: session.session_id,
        connected: session.status == "Connected" || session.status == "connected",
    })
}

#[tauri::command]
async fn place_call(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    number: String,
) -> Result<PlaceCallResult, String> {
    let trimmed = number.trim();
    if !trimmed.chars().any(|c| c.is_ascii_digit()) {
        return place_call_by_name(app, state, trimmed.trim_start_matches('@').to_string()).await;
    }
    let normalized = normalize_number(trimmed)?;

    let (username, wallet_id, storage_paid) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        stellar_client::validate_stellar_username(&user.username).map_err(|e| {
            format!("You cannot place a call without a valid Stellar username. {e}")
        })?;
        if user.personal_phone.is_empty() {
            return Err("Connect your personal phone line in Settings before calling.".into());
        }
        (
            user.username.clone(),
            user.circle_wallet_id.clone(),
            user.storage_paid,
        )
    };

    let engine = TelephonyEngineClient::from_env();
    let req = NameCallRequest {
        from_name: username.clone(),
        to_name: normalized.clone(),
        circle_wallet_id: wallet_id,
    };

    let session = if engine.health().await {
        engine.initiate_name_call(&req).await?
    } else {
        TelephonyEngineClient::simulate_name_call(&req)
    };

    let record = CallRecord {
        id: format!("call-{}", now_unix()),
        number: normalized.clone(),
        peer_name: normalized.clone(),
        direction: "outbound".into(),
        status: session.status.clone(),
        caller_id_shown: "RESTRICTED".into(),
        started_at: now_unix(),
    };

    with_store(&state, |store| {
        store.active_call_session = Some(session.session_id.clone());
        if storage_paid {
            store
                .call_history_by_user
                .entry(username.clone())
                .or_default()
                .insert(0, record.clone());
        }
        store.save_to_disk(&app)?;
        Ok(())
    })?;

    Ok(PlaceCallResult {
        record,
        telephony_available: true,
        message: session.message,
        masked_caller_id: "RESTRICTED".into(),
        caller_id_shown: "RESTRICTED".into(),
        session_id: session.session_id,
        connected: session.status == "Connected" || session.status == "connected",
    })
}

#[tauri::command]
fn get_call_history(state: State<AppState>) -> Result<Vec<CallRecord>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let user = store
        .current_user
        .as_ref()
        .ok_or_else(|| "Not signed in".to_string())?;
    if !user.storage_paid {
        return Ok(vec![]);
    }
    Ok(store
        .call_history_by_user
        .get(&user.username)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
fn save_contact(
    app: tauri::AppHandle,
    state: State<AppState>,
    contact: Contact,
) -> Result<Vec<Contact>, String> {
    with_store(&state, |store| {
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        if !user.storage_paid {
            return Err("Activate 1 GB storage to save contacts.".into());
        }
        let username = user.username.clone();
        let list = store.contacts_by_user.entry(username).or_default();
        list.retain(|c| c.number != contact.number);
        list.push(contact);
        list.sort_by(|a, b| a.name.cmp(&b.name));
        let updated = list.clone();
        store.save_to_disk(&app)?;
        Ok(updated)
    })
}

#[tauri::command]
fn get_contacts(state: State<AppState>) -> Result<Vec<Contact>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let user = store
        .current_user
        .as_ref()
        .ok_or_else(|| "Not signed in".to_string())?;
    if !user.storage_paid {
        return Ok(vec![]);
    }
    Ok(store
        .contacts_by_user
        .get(&user.username)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
fn logout(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
    with_store(&state, |store| {
        store.current_user = None;
        store.save_to_disk(&app)
    })
}

#[tauri::command]
async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_wallet_summary(state: State<'_, AppState>) -> Result<WalletSummary, String> {
    let (stellar, wallet_id, circle) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        (
            user.stellar_public_key.clone(),
            user.circle_wallet_id.clone(),
            user.circle_wallet_address.clone(),
        )
    };
    wallet::wallet_summary(&state.config.api_gateway_url, &stellar, &wallet_id, &circle).await
}

#[tauri::command]
async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let (personal_phone_connected, calls, contacts, escrows_active) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        let calls = store
            .call_history_by_user
            .get(&user.username)
            .map(|v| v.len())
            .unwrap_or(0);
        let contacts = store
            .contacts_by_user
            .get(&user.username)
            .map(|v| v.len())
            .unwrap_or(0);
        let escrows_active = store
            .escrows_by_user
            .get(&user.username)
            .map(|v| {
                v.iter()
                    .filter(|e| matches!(e.status.as_str(), "Active" | "Funded" | "ReleasePending"))
                    .count()
            })
            .unwrap_or(0);
        (
            !user.personal_phone.is_empty(),
            calls,
            contacts,
            escrows_active,
        )
    };
    let engine = EscrowEngineClient::new(state.config.escrow_engine_url.clone());
    let telephony = TelephonyEngineClient::from_env();
    Ok(DashboardStats {
        calls_count: calls,
        contacts_count: contacts,
        escrows_active,
        escrow_engine_online: engine.health().await,
        telephony_engine_online: telephony.health().await,
        personal_phone_connected,
    })
}

#[tauri::command]
fn list_escrows(state: State<AppState>) -> Result<Vec<EscrowContract>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let user = store
        .current_user
        .as_ref()
        .ok_or_else(|| "Not signed in".to_string())?;
    Ok(store
        .escrows_by_user
        .get(&user.username)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
async fn create_escrow(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    seller_id: String,
    amount: f64,
    currency: String,
) -> Result<EscrowContract, String> {
    let (buyer_id, wallet_id) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        (user.username.clone(), user.circle_wallet_id.clone())
    };

    if amount <= 0.0 {
        return Err("Amount must be positive".into());
    }
    if buyer_id == seller_id {
        return Err("Buyer and seller must differ".into());
    }

    let (_, usdc_balance) =
        circle_client::get_wallet_balances(&state.config.api_gateway_url, &wallet_id).await?;
    let buyer_balance: f64 = usdc_balance.parse().unwrap_or(0.0);
    if buyer_balance < amount {
        return Err(format!(
            "Insufficient wallet balance: you have {usdc_balance} USDC but need {amount} to back this escrow."
        ));
    }

    let contract_id = format!("esc-{}", now_unix());
    let draft = EscrowContract {
        contract_id: contract_id.clone(),
        buyer_id,
        seller_id,
        amount,
        currency,
        status: "Draft".into(),
        circle_fund_tx_id: None,
        buyer_balance,
        min_billable_seconds: 60,
        rate_per_second: amount / 300.0,
        call_session_id: None,
    };

    let engine = EscrowEngineClient::new(state.config.escrow_engine_url.clone());
    let created = if engine.health().await {
        engine.create_contract(&draft).await?
    } else {
        draft
    };

    with_store(&state, |store| {
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        store
            .escrows_by_user
            .entry(user.username.clone())
            .or_default()
            .push(created.clone());
        store.save_to_disk(&app)?;
        Ok(created)
    })
}

#[tauri::command]
async fn transition_escrow(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    contract_id: String,
    request_type: String,
) -> Result<EscrowContract, String> {
    let (requester_id, buyer_wallet_id) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        (user.username.clone(), user.circle_wallet_id.clone())
    };

    let current = with_store(&state, |store| {
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        store
            .escrows_by_user
            .get(&user.username)
            .and_then(|list| list.iter().find(|c| c.contract_id == contract_id).cloned())
            .ok_or_else(|| "Contract not found".to_string())
    })?;

    let mut circle_fund_tx_id = current.circle_fund_tx_id.clone();

    if request_type == "fund"
        && current.currency.eq_ignore_ascii_case("USDC")
        && requester_id == current.buyer_id
        && circle_fund_tx_id.is_none()
    {
        let amount = format!("{:.2}", current.amount);
        let tx = circle_client::fund_escrow(
            &state.config.api_gateway_url,
            &buyer_wallet_id,
            &contract_id,
            &amount,
        )
        .await?;
        circle_fund_tx_id = Some(tx.id);
    }

    let request = TransitionRequest {
        request_type: request_type.clone(),
        requester_id: requester_id.clone(),
        duration_seconds: None,
    };

    let engine = EscrowEngineClient::new(state.config.escrow_engine_url.clone());
    let mut updated = if engine.health().await {
        engine.transition(&contract_id, request).await?
    } else {
        EscrowEngineClient::local_transition(&current, &request)?
    };
    updated.circle_fund_tx_id = circle_fund_tx_id;

    with_store(&state, |store| {
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        if let Some(list) = store.escrows_by_user.get_mut(&user.username) {
            if let Some(slot) = list.iter_mut().find(|c| c.contract_id == contract_id) {
                *slot = updated.clone();
            }
        }
        store.save_to_disk(&app)?;
        Ok(updated)
    })
}

#[tauri::command]
async fn connect_personal_phone(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    personal_phone: String,
    account_type: String,
    call_toll_usdc: Option<f64>,
    sms_toll_usdc: Option<f64>,
    message_gift_usdc: Option<f64>,
) -> Result<PublicUser, String> {
    let normalized = normalize_number(&personal_phone)?;
    let config = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        PhoneLineConfig {
            stellar_name: user.username.clone(),
            personal_phone: normalized.clone(),
            account_type: account_type.clone(),
            call_toll_usdc,
            sms_toll_usdc,
            message_gift_usdc,
        }
    };

    let engine = TelephonyEngineClient::from_env();
    if engine.health().await {
        engine.register_phone(&config).await?;
    }

    with_store(&state, |store| {
        let user = store
            .current_user
            .as_mut()
            .ok_or_else(|| "Not signed in".to_string())?;
        user.personal_phone = normalized;
        user.account_type = account_type;
        user.call_toll_usdc = call_toll_usdc;
        user.sms_toll_usdc = sms_toll_usdc;
        user.message_gift_usdc = message_gift_usdc;
        store.users.insert(user.username.clone(), user.clone());
        let updated = PublicUser::from(user.clone());
        store.save_to_disk(&app)?;
        Ok(updated)
    })
}

#[tauri::command]
async fn send_sms(
    state: State<'_, AppState>,
    to_name: String,
    body: String,
    gift_usdc: Option<f64>,
) -> Result<telephony::SmsMessage, String> {
    let from_name = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        if user.personal_phone.is_empty() {
            return Err("Connect your personal phone line in Settings first.".into());
        }
        user.username.clone()
    };
    let engine = TelephonyEngineClient::from_env();
    let req = SendSmsRequest {
        from_name,
        to_name,
        body,
        gift_usdc,
    };
    if engine.health().await {
        engine.send_sms(&req).await
    } else {
        Ok(telephony::SmsMessage {
            id: format!("local-{}", now_unix()),
            from_name: req.from_name,
            to_name: req.to_name,
            body: req.body,
            sent_at: now_unix() as i64,
            gift_usdc: req.gift_usdc,
        })
    }
}

#[tauri::command]
async fn get_sms_messages(
    state: State<'_, AppState>,
) -> Result<Vec<telephony::SmsMessage>, String> {
    let username = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };
    let engine = TelephonyEngineClient::from_env();
    if engine.health().await {
        engine.list_sms(&username).await
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
async fn create_calendar_event(
    state: State<'_, AppState>,
    title: String,
    starts_at: i64,
    ends_at: i64,
    with_name: Option<String>,
) -> Result<CalendarEvent, String> {
    let owner = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };
    let event = CalendarEvent {
        id: format!("ev-{}", now_unix()),
        owner_name: owner.clone(),
        title,
        starts_at,
        ends_at,
        with_name,
    };
    let engine = TelephonyEngineClient::from_env();
    if engine.health().await {
        engine.create_event(&event).await
    } else {
        Ok(event)
    }
}

#[tauri::command]
async fn get_calendar_events(
    state: State<'_, AppState>,
) -> Result<Vec<CalendarEvent>, String> {
    let username = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };
    let engine = TelephonyEngineClient::from_env();
    if engine.health().await {
        engine.list_calendar(&username).await
    } else {
        Ok(vec![])
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::from_env())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Ok(loaded) = load_store(app.handle()) {
                if let Ok(mut guard) = app.state::<AppState>().store.lock() {
                    *guard = loaded;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_username_rules,
            get_billing_status,
            get_session,
            register_account,
            login_account,
            create_storage_invoice,
            verify_and_activate_storage,
            demo_activate_storage,
            place_call,
            place_call_by_name,
            end_call,
            get_call_history,
            save_contact,
            get_contacts,
            logout,
            open_url,
            get_wallet_summary,
            get_dashboard_stats,
            list_escrows,
            create_escrow,
            transition_escrow,
            connect_personal_phone,
            send_sms,
            get_sms_messages,
            create_calendar_event,
            get_calendar_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
