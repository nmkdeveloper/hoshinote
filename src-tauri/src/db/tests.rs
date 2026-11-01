use rusqlite::Connection;
use crate::db::connection::configure_connection;
use crate::db::schema::run_migrations;
use crate::db::search::{sanitize_fts5_query, search_notes};

fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("In-memory db must open");
    configure_connection(&conn).expect("Pragmas must apply");
    run_migrations(&conn).expect("Migrations must succeed");
    conn
}

#[test]
fn test_schema_migration_idempotent() {
    let conn = setup_test_db();
    // Running migrations again must succeed without error
    assert!(run_migrations(&conn).is_ok());

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations", [], |row| row.get(0))
        .expect("Query _migrations");
    assert_eq!(count, 1);
}

#[test]
fn test_foreign_key_cascades() {
    let conn = setup_test_db();
    conn.execute(
        "INSERT INTO notes (id, title, content) VALUES ('note-1', 'Source Note', 'Hello world');",
        [],
    ).unwrap();
    conn.execute(
        "INSERT INTO notes (id, title, content) VALUES ('note-2', 'Target Note', 'Target content');",
        [],
    ).unwrap();
    conn.execute(
        "INSERT INTO links (id, source_id, target_id, target_title) VALUES ('link-1', 'note-1', 'note-2', 'Target Note');",
        [],
    ).unwrap();
    conn.execute(
        "INSERT INTO tags (name) VALUES ('rust');",
        [],
    ).unwrap();
    let tag_id: i64 = conn.query_row("SELECT id FROM tags WHERE name = 'rust'", [], |r| r.get(0)).unwrap();
    conn.execute(
        "INSERT INTO note_tags (note_id, tag_id) VALUES ('note-1', ?1);",
        [tag_id],
    ).unwrap();

    // Delete source note-1 -> should cascade delete link-1 and note_tag
    conn.execute("DELETE FROM notes WHERE id = 'note-1'", []).unwrap();

    let link_count: i64 = conn.query_row("SELECT COUNT(*) FROM links WHERE id = 'link-1'", [], |r| r.get(0)).unwrap();
    assert_eq!(link_count, 0, "Outgoing link must be cascade deleted");

    let tag_link_count: i64 = conn.query_row("SELECT COUNT(*) FROM note_tags WHERE note_id = 'note-1'", [], |r| r.get(0)).unwrap();
    assert_eq!(tag_link_count, 0, "Note tag junction must be cascade deleted");
}

#[test]
fn test_dangling_link_on_target_delete_and_relink() {
    let conn = setup_test_db();
    // Insert source note referencing future note
    conn.execute("INSERT INTO notes (id, title, content) VALUES ('note-a', 'Alpha', 'Ref to Beta');", []).unwrap();
    conn.execute("INSERT INTO links (id, source_id, target_id, target_title) VALUES ('link-b', 'note-a', NULL, 'Beta');", []).unwrap();

    // Verify initially dangling
    let target_id: Option<String> = conn.query_row("SELECT target_id FROM links WHERE id = 'link-b'", [], |r| r.get(0)).unwrap();
    assert_eq!(target_id, None);

    // Insert Beta -> Trigger trg_notes_relink_insert should bind target_id
    conn.execute("INSERT INTO notes (id, title, content) VALUES ('note-b', 'Beta', 'Content of Beta');", []).unwrap();
    let resolved_id: Option<String> = conn.query_row("SELECT target_id FROM links WHERE id = 'link-b'", [], |r| r.get(0)).unwrap();
    assert_eq!(resolved_id, Some("note-b".to_string()));

    // Delete Beta -> ON DELETE SET NULL should revert target_id to NULL, keeping link record
    conn.execute("DELETE FROM notes WHERE id = 'note-b'", []).unwrap();
    let revert_id: Option<String> = conn.query_row("SELECT target_id FROM links WHERE id = 'link-b'", [], |r| r.get(0)).unwrap();
    assert_eq!(revert_id, None);

    // Insert note with different title, then rename to Beta -> Trigger trg_notes_relink_update should bind target_id
    conn.execute("INSERT INTO notes (id, title, content) VALUES ('note-c', 'Charlie', 'Temp');", []).unwrap();
    conn.execute("UPDATE notes SET title = 'Beta' WHERE id = 'note-c'", []).unwrap();
    let re_resolved_id: Option<String> = conn.query_row("SELECT target_id FROM links WHERE id = 'link-b'", [], |r| r.get(0)).unwrap();
    assert_eq!(re_resolved_id, Some("note-c".to_string()));
}

#[test]
fn test_fts5_triggers_and_ranking() {
    let conn = setup_test_db();
    conn.execute("INSERT INTO notes (id, title, content) VALUES ('1', 'Quantum Mechanics', 'Wave equation foundations');", []).unwrap();
    conn.execute("INSERT INTO notes (id, title, content) VALUES ('2', 'Calculus', 'Differential equations and quantum physics');", []).unwrap();

    // Search for quantum
    let results = search_notes(&conn, "quantum").unwrap();
    assert_eq!(results.len(), 2);
    // Note 1 has quantum in title, note 2 only in content -> Note 1 rank must exceed Note 2 rank
    assert_eq!(results[0].title, "Quantum Mechanics");
    assert!(results[0].rank >= results[1].rank);

    // Update note 1 content
    conn.execute("UPDATE notes SET content = 'No more physics keywords' WHERE id = '1'", []).unwrap();
    let results_after = search_notes(&conn, "foundations").unwrap();
    assert_eq!(results_after.len(), 0, "Updated content must be reflected in FTS");

    // Delete note 2
    conn.execute("DELETE FROM notes WHERE id = '2'", []).unwrap();
    let results_del = search_notes(&conn, "Calculus").unwrap();
    assert_eq!(results_del.len(), 0, "Deleted note must be removed from FTS");
}

#[test]
fn test_fts5_sanitization_adversarial_queries() {
    let dangerous_inputs = [
        "",
        "   ",
        "\"unclosed quote",
        "AND",
        "OR",
        "NOT",
        "(unbalanced parenthesis",
        "c++",
        "*wildcard_start",
        "react-dom",
        "it's an apostrophe",
        "$$math$$",
    ];

    for input in dangerous_inputs {
        let sanitized = sanitize_fts5_query(input);
        // Must not panic
        assert!(!sanitized.contains("(*"));
    }
}
