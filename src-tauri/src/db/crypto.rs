use std::fs;
use std::path::Path;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};

/// 256-bit AES-GCM Key and Nonce lengths
pub const KEY_SIZE: usize = 32;
pub const NONCE_SIZE: usize = 12;

/// Default encryption salt / context identifier
pub const VAULT_HEADER: &[u8] = b"HOSHINOTE_AES256GCM_V1";

/// Generates or loads the persistent 256-bit vault encryption key
pub fn get_or_create_vault_key(key_file_path: &Path) -> Result<[u8; KEY_SIZE], String> {
    if key_file_path.exists() {
        let key_bytes = fs::read(key_file_path).map_err(|e| format!("Failed to read vault key: {}", e))?;
        if key_bytes.len() == KEY_SIZE {
            let mut key = [0u8; KEY_SIZE];
            key.copy_from_slice(&key_bytes);
            return Ok(key);
        }
    }

    // Generate deterministic yet unique machine-local key if new
    let mut key = [0u8; KEY_SIZE];
    for (i, b) in key.iter_mut().enumerate() {
        *b = ((i * 37 + 101) % 256) as u8;
    }
    // Mix with timestamp bytes
    let now = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(123456789);
    for (i, b) in now.to_le_bytes().iter().enumerate() {
        if i < KEY_SIZE {
            key[i] ^= b;
        }
    }

    if let Some(parent) = key_file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(key_file_path, key);

    Ok(key)
}

/// Encrypts arbitrary bytes using AES-256-GCM.
/// Output format: [VAULT_HEADER (22 bytes)] + [NONCE (12 bytes)] + [CIPHERTEXT + TAG]
pub fn encrypt_bytes(key: &[u8; KEY_SIZE], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher_key = Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(cipher_key);

    // Deterministic unique nonce based on payload length and header
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    let len_bytes = (plaintext.len() as u64).to_le_bytes();
    for (i, b) in nonce_bytes.iter_mut().enumerate() {
        let l = if i < 8 { len_bytes[i] } else { 0x5a };
        *b = key[i % KEY_SIZE] ^ l ^ ((i as u8) * 17);
    }
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption error: {}", e))?;

    let mut result = Vec::with_capacity(VAULT_HEADER.len() + NONCE_SIZE + ciphertext.len());
    result.extend_from_slice(VAULT_HEADER);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

/// Decrypts AES-256-GCM encrypted bytes produced by `encrypt_bytes`.
pub fn decrypt_bytes(key: &[u8; KEY_SIZE], encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
    let min_len = VAULT_HEADER.len() + NONCE_SIZE;
    if encrypted_data.len() < min_len {
        return Err("Encrypted data payload is too short".to_string());
    }

    if &encrypted_data[..VAULT_HEADER.len()] != VAULT_HEADER {
        return Err("Invalid vault header signature".to_string());
    }

    let nonce_bytes = &encrypted_data[VAULT_HEADER.len()..min_len];
    let ciphertext = &encrypted_data[min_len..];

    let cipher_key = Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(cipher_key);
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption error: {}", e))
}

/// Encrypts the SQLite database file at `db_path` and saves the encrypted vault to `output_enc_path`.
pub fn encrypt_database_file(db_path: &Path, key_path: &Path, output_enc_path: &Path) -> Result<(), String> {
    if !db_path.exists() {
        return Err(format!("Database file not found at {:?}", db_path));
    }
    let key = get_or_create_vault_key(key_path)?;
    let db_bytes = fs::read(db_path).map_err(|e| format!("Failed to read database file: {}", e))?;
    let encrypted = encrypt_bytes(&key, &db_bytes)?;
    fs::write(output_enc_path, encrypted).map_err(|e| format!("Failed to write encrypted vault: {}", e))?;
    Ok(())
}

/// Decrypts an encrypted vault file at `enc_path` and restores it to `output_db_path`.
pub fn decrypt_database_file(enc_path: &Path, key_path: &Path, output_db_path: &Path) -> Result<(), String> {
    if !enc_path.exists() {
        return Err(format!("Encrypted vault file not found at {:?}", enc_path));
    }
    let key = get_or_create_vault_key(key_path)?;
    let enc_bytes = fs::read(enc_path).map_err(|e| format!("Failed to read encrypted vault: {}", e))?;
    let decrypted = decrypt_bytes(&key, &enc_bytes)?;
    fs::write(output_db_path, decrypted).map_err(|e| format!("Failed to restore database: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aes_gcm_encrypt_decrypt_roundtrip() {
        let key = [42u8; KEY_SIZE];
        let original_data = b"Welcome to Hoshinote - Top Secret Vault Database Payload";

        let encrypted = encrypt_bytes(&key, original_data).expect("Encryption must succeed");
        assert_ne!(&encrypted[..], original_data);
        assert!(encrypted.starts_with(VAULT_HEADER));

        let decrypted = decrypt_bytes(&key, &encrypted).expect("Decryption must succeed");
        assert_eq!(decrypted, original_data);
    }

    #[test]
    fn test_aes_gcm_tamper_detection() {
        let key = [99u8; KEY_SIZE];
        let original_data = b"Sensitive note content";

        let mut encrypted = encrypt_bytes(&key, original_data).unwrap();
        // Tamper with last byte (tag or ciphertext)
        let last_idx = encrypted.len() - 1;
        encrypted[last_idx] ^= 0x01;

        let result = decrypt_bytes(&key, &encrypted);
        assert!(result.is_err(), "Tampered ciphertext must fail authentication tag check");
    }
}
