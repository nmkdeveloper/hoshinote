pub mod connection;
pub mod crypto;
pub mod schema;
pub mod search;

#[cfg(test)]
mod tests;

use std::path::Path;
use std::sync::{Mutex, MutexGuard};
use rusqlite::Connection;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        connection::configure_connection(&conn)?;
        schema::run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn new_in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        connection::configure_connection(&conn)?;
        schema::run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn lock(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().expect("Database mutex lock poisoned")
    }

    pub fn get_conn(&self) -> &Mutex<Connection> {
        &self.conn
    }
}
