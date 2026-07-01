use crate::models::StellarIdentity;
use ed25519_dalek::SigningKey;
use rand::rngs::OsRng;

/// Stellar-style usernames map to ed25519 keypairs used as network identity.
pub fn register_username(username: &str) -> Result<StellarIdentity, String> {
    if username.len() < 3 {
        return Err("Username must be at least 3 characters".into());
    }
    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.')
    {
        return Err("Username may only contain letters, numbers, underscores, and dots".into());
    }

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
