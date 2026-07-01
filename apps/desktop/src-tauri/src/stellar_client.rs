use crate::models::StellarIdentity;
use ed25519_dalek::SigningKey;
use rand::rngs::OsRng;

pub const USERNAME_MIN_LEN: usize = 7;
pub const USERNAME_MAX_LEN: usize = 22;

/// Stellar usernames: 7–22 chars, letters/numbers/._ only, at least one digit.
pub fn validate_stellar_username(username: &str) -> Result<(), String> {
    let len = username.chars().count();
    if len < USERNAME_MIN_LEN {
        return Err(format!(
            "Stellar username must be at least {USERNAME_MIN_LEN} characters (yours is {len})."
        ));
    }
    if len > USERNAME_MAX_LEN {
        return Err(format!(
            "Stellar username must be at most {USERNAME_MAX_LEN} characters (yours is {len})."
        ));
    }
    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.')
    {
        return Err(
            "Stellar username may only use letters, numbers, underscores, and dots.".into(),
        );
    }
    if !username.chars().any(|c| c.is_ascii_digit()) {
        return Err(
            "Stellar username must include at least one number to place masked calls (e.g. alex.42).".into(),
        );
    }
    Ok(())
}

pub fn format_dial_address(name: &str, public_key: &str) -> String {
    let tail = if public_key.len() > 12 {
        format!(
            "{}…{}",
            &public_key[..8.min(public_key.len())],
            &public_key[public_key.len().saturating_sub(4)..]
        )
    } else {
        public_key.to_string()
    };
    format!("@{name} · {tail}")
}

pub fn sign_sms_payload(stellar_name: &str, public_key: &str, body: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(format!("{stellar_name}|{public_key}|{body}").as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn register_username(username: &str) -> Result<StellarIdentity, String> {
    validate_stellar_username(username)?;

    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();
    let public_bytes = verifying_key.to_bytes();
    let secret_bytes = signing_key.to_bytes();

    Ok(StellarIdentity {
        public_key: format!("G{}", hex::encode(&public_bytes[..16])),
        secret_key: format!(
            "S{}_{}",
            hex::encode(&secret_bytes[..8]),
            username.to_lowercase()
        ),
    })
}
