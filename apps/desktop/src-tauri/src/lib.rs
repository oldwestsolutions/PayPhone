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
use telephony::{derive_masked_number, MaskProxyClient, MaskedCallRequest};
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
fn end_call(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
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
async fn place_call(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    number: String,
) -> Result<PlaceCallResult, String> {
    let normalized = normalize_number(&number)?;

    let (username, wallet_id, masked_from, storage_paid) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        stellar_client::validate_stellar_username(&user.username).map_err(|e| {
            format!(
                "You cannot place a call without a valid Stellar username. {e}"
            )
        })?;
        (
            user.username.clone(),
            user.circle_wallet_id.clone(),
            user.masked_number.clone(),
            user.storage_paid,
        )
    };

    let proxy = MaskProxyClient::from_env();
    let req = MaskedCallRequest {
        stellar_username: username.clone(),
        circle_wallet_id: wallet_id,
        masked_from: masked_from.clone(),
        to_number: normalized.clone(),
    };

    let session = if proxy.health().await {
        proxy.initiate_masked_call(&req).await?
    } else {
        telephony::MaskProxyClient::simulate_masked_call(&req)
    };

    let record = CallRecord {
        id: format!("call-{}", now_unix()),
        number: normalized.clone(),
        direction: "outbound".into(),
        status: session.status.clone(),
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
        masked_caller_id: session.masked_from,
        session_id: session.session_id,
        connected: session.status == "connected",
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
    let (stellar, circle) = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        let user = store
            .current_user
            .as_ref()
            .ok_or_else(|| "Not signed in".to_string())?;
        (user.stellar_public_key.clone(), user.circle_wallet_address.clone())
    };
    wallet::wallet_summary(&stellar, &circle).await
}

#[tauri::command]
async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let (_username, calls, contacts, escrows_active) = {
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
        (user.username.clone(), calls, contacts, escrows_active)
    };
    let engine = EscrowEngineClient::new(state.config.escrow_engine_url.clone());
    let online = engine.health().await;
    Ok(DashboardStats {
        calls_count: calls,
        contacts_count: contacts,
        escrows_active,
        escrow_engine_online: online,
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
    let buyer_id = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };

    if amount <= 0.0 {
        return Err("Amount must be positive".into());
    }
    if buyer_id == seller_id {
        return Err("Buyer and seller must differ".into());
    }

    let contract_id = format!("esc-{}", now_unix());
    let draft = EscrowContract {
        contract_id: contract_id.clone(),
        buyer_id,
        seller_id,
        amount,
        currency,
        status: "Draft".into(),
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
    let requester_id = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .current_user
            .as_ref()
            .map(|u| u.username.clone())
            .ok_or_else(|| "Not signed in".to_string())?
    };

    let request = TransitionRequest {
        request_type,
        requester_id,
    };

    let engine = EscrowEngineClient::new(state.config.escrow_engine_url.clone());
    let updated = if engine.health().await {
        engine.transition(&contract_id, request).await?
    } else {
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
        EscrowEngineClient::local_transition(&current, &request)?
    };

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
            transition_escrow
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
