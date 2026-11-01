use rusqlite::Connection;

/// Configures SQLite connection with standard high-performance production PRAGMAs:
/// - WAL journal mode (on disk)
/// - Foreign keys ON
/// - NORMAL synchronous
/// - 5,000ms busy timeout
/// - 64MB memory page cache (-64000)
pub fn configure_connection(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA synchronous = NORMAL;
         PRAGMA busy_timeout = 5000;
         PRAGMA cache_size = -64000;"
    )?;
    Ok(())
}
