use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use crate::db::connection::configure_connection;
use crate::db::crypto::{encrypt_database_file, get_or_create_vault_key};
use crate::db::schema::run_migrations;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub db_path: Option<PathBuf>,
    pub key_path: Option<PathBuf>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            db: Arc::new(Mutex::new(conn)),
            db_path: None,
            key_path: None,
        }
    }

    pub fn open_or_create(path: &Path) -> Result<Self, rusqlite::Error> {
        let key_path = path.with_extension("key");
        let enc_path = path.with_extension("db.enc");

        // Restore from encrypted snapshot if plaintext database is missing
        if !path.exists() && enc_path.exists() && key_path.exists() {
            let _ = crate::db::crypto::decrypt_database_file(&enc_path, &key_path, path);
        }

        let conn = Connection::open(path)?;
        configure_connection(&conn)?;
        run_migrations(&conn)?;

        let _ = get_or_create_vault_key(&key_path);

        let state = Self {
            db: Arc::new(Mutex::new(conn)),
            db_path: Some(path.to_path_buf()),
            key_path: Some(key_path),
        };

        // Perform initial encryption snapshot
        let _ = state.save_and_encrypt();

        Ok(state)
    }

    pub fn in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        configure_connection(&conn)?;
        run_migrations(&conn)?;
        Ok(Self::new(conn))
    }

    /// Flushes SQLite WAL and creates an AES-256-GCM encrypted snapshot of the database
    pub fn save_and_encrypt(&self) -> Result<String, String> {
        if let (Some(db_path), Some(key_path)) = (&self.db_path, &self.key_path) {
            let conn = self.db.lock().map_err(|e| e.to_string())?;
            let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
            drop(conn);

            let enc_path = db_path.with_extension("db.enc");
            encrypt_database_file(db_path, key_path, &enc_path)?;
            Ok(format!("Database successfully encrypted to {:?}", enc_path))
        } else {
            Ok("In-memory database (no disk persistence required)".to_string())
        }
    }
}
