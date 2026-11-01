use std::sync::{Arc, Mutex};
use std::thread;

#[test]
fn test_sqlite_bundled_version_and_compile_options() {
    let conn = rusqlite::Connection::open_in_memory().expect("In-memory SQLite must open");
    let version: String = conn
        .query_row("SELECT sqlite_version()", [], |row| row.get(0))
        .expect("Query sqlite version");
    println!("SQLite bundled version: {}", version);
    assert!(!version.is_empty());

    let mut stmt = conn
        .prepare("PRAGMA compile_options;")
        .expect("PRAGMA compile_options");
    let options: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .expect("Query compile options")
        .map(|r| r.unwrap())
        .collect();
    println!("Compile options: {:?}", options);

    // Test FTS5 availability
    let fts_res = conn.execute("CREATE VIRTUAL TABLE fts_probe USING fts5(title, content);", []);
    println!("FTS5 support status: {:?}", fts_res);
}

#[test]
fn test_sqlite_stress_concurrency_mutex() {
    // Shared in-memory or WAL database wrapped in Arc<Mutex<rusqlite::Connection>>
    let conn = Arc::new(Mutex::new(
        rusqlite::Connection::open_in_memory().expect("Open in memory"),
    ));

    {
        let c = conn.lock().unwrap();
        c.execute(
            "CREATE TABLE stress_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id INT, payload TEXT);",
            [],
        )
        .expect("Create table");
    }

    let mut handles = Vec::new();
    let num_threads = 20;
    let ops_per_thread = 50;

    for t_id in 0..num_threads {
        let conn_clone = Arc::clone(&conn);
        let handle = thread::spawn(move || {
            for i in 0..ops_per_thread {
                let payload = format!("Thread {} operation {} data with unicode 🌟 🚀", t_id, i);
                let c = conn_clone.lock().unwrap();
                c.execute(
                    "INSERT INTO stress_notes (thread_id, payload) VALUES (?1, ?2);",
                    rusqlite::params![t_id, payload],
                )
                .expect("Insert operation");
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().expect("Thread join");
    }

    let c = conn.lock().unwrap();
    let count: i64 = c
        .query_row("SELECT COUNT(*) FROM stress_notes;", [], |row| row.get(0))
        .expect("Count rows");

    assert_eq!(count, (num_threads * ops_per_thread) as i64);
}

#[test]
fn test_sqlite_file_wal_concurrency() {
    let temp_dir = std::env::temp_dir();
    let db_path = temp_dir.join(format!("hoshinote_stress_wal_{}.db", uuid::Uuid::new_v4()));

    // Initialize DB with WAL mode
    {
        let conn = rusqlite::Connection::open(&db_path).expect("Open file DB");
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             CREATE TABLE notes (
                 id TEXT PRIMARY KEY,
                 title TEXT NOT NULL,
                 content TEXT,
                 created_at TEXT NOT NULL
             );",
        )
        .expect("Init DB schema");
    }

    let mut handles = Vec::new();
    // 10 concurrent readers / writers on separate connections
    for t_id in 0..10 {
        let path = db_path.clone();
        let handle = thread::spawn(move || {
            let conn = rusqlite::Connection::open(&path).expect("Open connection in thread");
            conn.busy_timeout(std::time::Duration::from_secs(5))
                .expect("Set busy timeout");

            for i in 0..20 {
                let note_id = format!("t{}-note-{}", t_id, i);
                let title = format!("Title {} from thread {}", i, t_id);
                let content = "Content for note with emoji 📚 and LaTeX: $\\frac{1}{2}$".to_string();

                conn.execute(
                    "INSERT INTO notes (id, title, content, created_at) VALUES (?1, ?2, ?3, datetime('now'));",
                    rusqlite::params![note_id, title, content],
                )
                .expect("Insert note");

                let read_title: String = conn
                    .query_row(
                        "SELECT title FROM notes WHERE id = ?1",
                        rusqlite::params![note_id],
                        |row| row.get(0),
                    )
                    .expect("Read own note");
                assert_eq!(read_title, title);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().expect("Join thread");
    }

    // Verify total count
    let conn = rusqlite::Connection::open(&db_path).expect("Open final");
    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM notes;", [], |row| row.get(0))
        .expect("Total count");
    assert_eq!(total, 200);

    // Clean up
    let _ = std::fs::remove_file(&db_path);
    let _ = std::fs::remove_file(format!("{}-wal", db_path.display()));
    let _ = std::fs::remove_file(format!("{}-shm", db_path.display()));
}
