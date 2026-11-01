use std::path::Path;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use crate::db::connection::configure_connection;
use crate::db::schema::run_migrations;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            db: Arc::new(Mutex::new(conn)),
        }
    }

    pub fn open_or_create(path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        configure_connection(&conn)?;
        run_migrations(&conn)?;
        Ok(Self::new(conn))
    }

    pub fn in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        configure_connection(&conn)?;
        run_migrations(&conn)?;
        Ok(Self::new(conn))
    }
}
