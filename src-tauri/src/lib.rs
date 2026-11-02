pub mod commands;
pub mod db;
pub mod models;
pub mod parser;
pub mod services;
pub mod state;

use tauri::Manager;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("hoshinote"));
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data directory");

            let db_path = app_data_dir.join("hoshinote.db");
            let state = AppState::open_or_create(&db_path)
                .expect("failed to initialize sqlite database");

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_status,
            commands::create_note,
            commands::get_note,
            commands::get_note_by_title,
            commands::update_note,
            commands::delete_note,
            commands::list_notes,
            commands::search_notes,
            commands::get_backlinks,
            commands::get_graph_data,
            commands::get_all_tags,
            commands::get_db_encryption_status,
            commands::encrypt_db,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_app_status() {
        let status = commands::get_app_status();
        assert!(status.is_ok());
        assert_eq!(status.unwrap(), "Hoshinote core online");
    }

    #[test]
    fn test_sqlite_bundled_connectivity() {
        let conn = rusqlite::Connection::open_in_memory().expect("In-memory SQLite must open");
        let version: String = conn
            .query_row("SELECT sqlite_version()", [], |row| row.get(0))
            .expect("Must query sqlite version");
        assert!(!version.is_empty(), "SQLite version must not be empty");

        conn.execute(
            "CREATE TABLE test_notes (id TEXT PRIMARY KEY, title TEXT NOT NULL);",
            [],
        )
        .expect("Table creation must succeed");

        conn.execute(
            "INSERT INTO test_notes (id, title) VALUES (?1, ?2);",
            rusqlite::params!["note-1", "Test Title"],
        )
        .expect("Insertion must succeed");

        let title: String = conn
            .query_row("SELECT title FROM test_notes WHERE id = ?1", ["note-1"], |row| row.get(0))
            .expect("Querying inserted note must succeed");

        assert_eq!(title, "Test Title");
    }
}
