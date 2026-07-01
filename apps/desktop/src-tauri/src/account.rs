use crate::models::{CallRecord, Contact, EscrowContract, UserAccount};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AccountStore {
    pub current_user: Option<UserAccount>,
    pub users: HashMap<String, UserAccount>,
    #[serde(default)]
    pub contacts_by_user: HashMap<String, Vec<Contact>>,
    #[serde(default)]
    pub call_history_by_user: HashMap<String, Vec<CallRecord>>,
    #[serde(default)]
    pub escrows_by_user: HashMap<String, Vec<EscrowContract>>,
    /// Legacy field — migrated into contacts_by_user on load.
    #[serde(default)]
    pub contacts: Vec<Contact>,
}

impl AccountStore {
    pub fn migrate_legacy(&mut self) {
        if !self.contacts.is_empty() {
            if let Some(user) = &self.current_user {
                self.contacts_by_user
                    .entry(user.username.clone())
                    .or_default()
                    .append(&mut self.contacts);
            }
            self.contacts.clear();
        }
    }

    pub fn save_to_disk(&self, app: &tauri::AppHandle) -> Result<(), String> {
        let path = store_path(app)?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())?;
        Ok(())
    }
}

pub fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("payphone_store.json"))
        .map_err(|e| e.to_string())
}

pub fn load_store(app: &tauri::AppHandle) -> Result<AccountStore, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(AccountStore::default());
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut store: AccountStore = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    store.migrate_legacy();
    Ok(store)
}

pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
