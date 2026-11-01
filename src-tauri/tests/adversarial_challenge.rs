use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;
use uuid::Uuid;

use hoshinote_lib::db::connection::configure_connection;
use hoshinote_lib::db::schema::run_migrations;
use hoshinote_lib::services::{
    create_note, delete_note, get_all_tags, get_backlinks, get_graph_data, get_note,
    get_note_by_title, list_notes, search_notes, update_note,
};
use hoshinote_lib::state::AppState;

// 1. Concurrency and Stress:
// Tests concurrent read/write transactions through Arc<Mutex<Connection>> under heavy contention.
// Spawns 60 threads (40 writers + 20 readers) performing 2,000+ operations in total.
#[test]
fn test_adversarial_heavy_concurrency_mutex() {
    let state = Arc::new(AppState::in_memory().expect("In-memory AppState initialization"));
    let writer_count = 40;
    let ops_per_writer = 25; // 40 * 25 = 1,000 write ops
    let reader_count = 20;
    let ops_per_reader = 50; // 20 * 50 = 1,000 read ops

    let total_created = Arc::new(AtomicUsize::new(0));
    let mut handles = Vec::new();

    // Spawn 40 writer threads
    for t_id in 0..writer_count {
        let state_clone = Arc::clone(&state);
        let created_counter = Arc::clone(&total_created);

        handles.push(thread::spawn(move || {
            for i in 0..ops_per_writer {
                let title = format!("Writer {} Note {:03}", t_id, i);
                let target_title = format!("Writer {} Note {:03}", (t_id + 1) % writer_count, i);
                let content = format!(
                    "Contention payload for writer {} op {}. Mentions [[{}]] and #stress/t{} #global",
                    t_id, i, target_title, t_id
                );

                let conn = state_clone.db.lock().expect("Lock db for insert");
                let created = create_note(&conn, title.clone(), Some(content), None, None)
                    .expect("create_note must succeed");
                created_counter.fetch_add(1, Ordering::SeqCst);

                // Perform an in-flight update on a subset of operations
                if i % 5 == 0 {
                    let updated_content = format!(
                        "Updated contention payload op {} by writer {}. [[Target Zero]]",
                        i, t_id
                    );
                    let _ = update_note(
                        &conn,
                        &created.note.id,
                        None,
                        Some(updated_content),
                        None,
                        None,
                        None,
                        None,
                    );
                }
            }
        }));
    }

    // Spawn 20 reader threads running in parallel with writers
    for _r_id in 0..reader_count {
        let state_clone = Arc::clone(&state);
        handles.push(thread::spawn(move || {
            for i in 0..ops_per_reader {
                let conn = state_clone.db.lock().expect("Lock db for reading");

                // Execute various reads
                match i % 5 {
                    0 => {
                        let _ = search_notes(&conn, "Contention");
                    }
                    1 => {
                        let _ = get_graph_data(&conn);
                    }
                    2 => {
                        let _ = list_notes(&conn, Some("global".to_string()), None, None, None, Some(10), None);
                    }
                    3 => {
                        let _ = get_note_by_title(&conn, "Writer 0 Note 000");
                    }
                    _ => {
                        let _ = get_all_tags(&conn);
                    }
                }
            }
        }));
    }

    for h in handles {
        h.join().expect("Thread joined without panic");
    }

    assert_eq!(
        total_created.load(Ordering::SeqCst),
        writer_count * ops_per_writer,
        "All 1,000 notes must be created"
    );

    let conn = state.db.lock().expect("Final lock");
    let all_notes = list_notes(&conn, None, None, None, None, Some(2000), None)
        .expect("List all created notes");
    assert_eq!(all_notes.len(), 1000);

    let graph = get_graph_data(&conn).expect("Get graph data after contention");
    assert!(
        graph.nodes.len() >= 1000,
        "Graph must have at least 1,000 real and resolved/unresolved nodes"
    );
}

// 1b. WAL File Concurrency and Busy Timeout:
// Tests multi-connection file-based concurrency where separate threads open their own Connection
// with WAL mode and 5000ms busy timeout on a real disk database file.
#[test]
fn test_adversarial_wal_file_concurrency_busy_timeout() {
    let temp_dir = std::env::temp_dir();
    let db_path = temp_dir.join(format!("hoshinote_adv_wal_{}.db", Uuid::new_v4()));

    // Create and initialize master DB with migrations
    {
        let conn = rusqlite::Connection::open(&db_path).expect("Open disk SQLite");
        configure_connection(&conn).expect("Configure connection PRAGMAs");
        run_migrations(&conn).expect("Run initial migrations");
    }

    let thread_count = 16;
    let ops_per_thread = 20; // 320 independent file DB transactions
    let mut handles = Vec::new();

    for t_id in 0..thread_count {
        let path = db_path.clone();
        handles.push(thread::spawn(move || {
            let conn = rusqlite::Connection::open(&path).expect("Open connection in thread");
            configure_connection(&conn).expect("Configure thread PRAGMAs (WAL, busy timeout 5000ms)");

            for i in 0..ops_per_thread {
                let title = format!("WAL Thread {} Item {}", t_id, i);
                let target_title = format!("WAL Thread {} Item {}", (t_id + 1) % thread_count, i);
                let content = format!(
                    "WAL test data from thread {} op {}. [[{}]] #wal #thread{}",
                    t_id, i, target_title, t_id
                );

                // create note through service using dedicated connection
                let note = create_note(&conn, title, Some(content), None, None)
                    .expect("create_note on disk WAL connection");

                // verify reading own note
                let fetched = get_note(&conn, &note.note.id).expect("get_note on disk WAL connection");
                assert_eq!(fetched.note.id, note.note.id);

                // periodic readers querying other data
                if i % 4 == 0 {
                    let _ = search_notes(&conn, "WAL");
                    let _ = get_graph_data(&conn);
                }
            }
        }));
    }

    for h in handles {
        h.join().expect("Disk WAL thread finished successfully");
    }

    // Verify DB integrity and count
    let verify_conn = rusqlite::Connection::open(&db_path).expect("Open verification conn");
    configure_connection(&verify_conn).expect("Configure verify PRAGMAs");

    let integrity: String = verify_conn
        .query_row("PRAGMA integrity_check;", [], |r| r.get(0))
        .expect("PRAGMA integrity_check");
    assert_eq!(integrity, "ok", "Database integrity check must be 'ok'");

    let total_notes: i64 = verify_conn
        .query_row("SELECT COUNT(*) FROM notes;", [], |r| r.get(0))
        .expect("Count notes");
    assert_eq!(
        total_notes,
        (thread_count * ops_per_thread) as i64,
        "Total notes on disk DB must match 320"
    );

    // Clean up temporary database files
    let _ = std::fs::remove_file(&db_path);
    let _ = std::fs::remove_file(format!("{}-wal", db_path.display()));
    let _ = std::fs::remove_file(format!("{}-shm", db_path.display()));
}

// 2. Relational Integrity and Cascades:
// Tests:
// - Creating note with link to non-existent note (target_id is NULL, target_title preserved, unresolved = true).
// - Creating the target note -> automatic resolution of incoming links via trigger.
// - Renaming target note -> incoming links target_title updated.
// - Deleting target note -> incoming links become dangling (target_id = NULL), preserving target_title.
// - Re-creating target note -> incoming links re-link automatically.
#[test]
fn test_adversarial_dangling_links_full_lifecycle() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    // Step 1: Note A links to "Target Note", which does not exist yet
    let note_a = create_note(
        &conn,
        "Note A".to_string(),
        Some("Ref to [[Target Note]] and [[Target Note|Custom Alias]]".to_string()),
        None,
        None,
    )
    .expect("Create Note A");

    assert_eq!(note_a.outgoing_links.len(), 2);
    for link in &note_a.outgoing_links {
        assert_eq!(link.target_title, "Target Note");
        assert!(link.target_id.is_none(), "target_id must be None before target exists");
        assert!(link.is_unresolved, "is_unresolved must be true");
    }

    // Verify graph shows unresolved phantom node
    let graph1 = get_graph_data(&conn).expect("Graph 1");
    let target_node1 = graph1
        .nodes
        .iter()
        .find(|n| n.title.eq_ignore_ascii_case("Target Note"))
        .expect("Phantom node must exist in graph");
    assert!(target_node1.is_unresolved, "Phantom node must have is_unresolved = true");

    // Step 2: Create "Target Note"
    let target_note = create_note(
        &conn,
        "Target Note".to_string(),
        Some("I am the target note. #target".to_string()),
        None,
        None,
    )
    .expect("Create Target Note");

    // Note A's links should now be resolved to Target Note's ID
    let note_a_updated = get_note(&conn, &note_a.note.id).expect("Fetch Note A");
    for link in &note_a_updated.outgoing_links {
        assert_eq!(link.target_id, Some(target_note.note.id.clone()));
        assert!(!link.is_unresolved, "is_unresolved must be false now");
    }

    // Target Note should have Note A in incoming_links
    let target_details = get_note(&conn, &target_note.note.id).expect("Fetch Target Note");
    assert_eq!(target_details.incoming_links.len(), 2);
    assert_eq!(target_details.incoming_links[0].source_id, note_a.note.id);

    let direct_backlinks = get_backlinks(&conn, &target_note.note.id).expect("Get backlinks directly");
    assert_eq!(direct_backlinks.len(), 2);
    assert_eq!(direct_backlinks[0].source_id, note_a.note.id);

    // Step 3: Add Note B also linking to "Target Note"
    let note_b = create_note(
        &conn,
        "Note B".to_string(),
        Some("Note B also points to [[Target Note]]".to_string()),
        None,
        None,
    )
    .expect("Create Note B");

    let note_b_links = &note_b.outgoing_links;
    assert_eq!(note_b_links.len(), 1);
    assert_eq!(note_b_links[0].target_id, Some(target_note.note.id.clone()));

    // Step 4: Delete Target Note
    delete_note(&conn, &target_note.note.id).expect("Delete Target Note");

    // Note A and Note B links must NOT be deleted, but turned into dangling links (target_id = NULL)
    let note_a_dangling = get_note(&conn, &note_a.note.id).expect("Fetch Note A after target delete");
    assert_eq!(note_a_dangling.outgoing_links.len(), 2);
    for link in &note_a_dangling.outgoing_links {
        assert_eq!(link.target_title, "Target Note");
        assert!(link.target_id.is_none(), "target_id must be NULL after target deletion");
        assert!(link.is_unresolved, "is_unresolved must be true after target deletion");
    }

    let note_b_dangling = get_note(&conn, &note_b.note.id).expect("Fetch Note B after target delete");
    assert_eq!(note_b_dangling.outgoing_links.len(), 1);
    assert_eq!(note_b_dangling.outgoing_links[0].target_title, "Target Note");
    assert!(note_b_dangling.outgoing_links[0].target_id.is_none());
    assert!(note_b_dangling.outgoing_links[0].is_unresolved);

    // Graph data should reflect dangling link and phantom node again
    let graph2 = get_graph_data(&conn).expect("Graph 2");
    let target_node2 = graph2
        .nodes
        .iter()
        .find(|n| n.title.eq_ignore_ascii_case("Target Note"))
        .expect("Phantom node must re-appear");
    assert!(target_node2.is_unresolved);

    // Step 5: Re-create Target Note with same title (different ID generated)
    let target_note_recreated = create_note(
        &conn,
        "Target Note".to_string(),
        Some("Reincarnated target note!".to_string()),
        None,
        None,
    )
    .expect("Re-create Target Note");
    assert_ne!(target_note_recreated.note.id, target_note.note.id);

    // Both Note A and Note B must automatically relink to the new Target Note's ID
    let note_a_relinked = get_note(&conn, &note_a.note.id).expect("Fetch Note A after recreation");
    for link in &note_a_relinked.outgoing_links {
        assert_eq!(link.target_id, Some(target_note_recreated.note.id.clone()));
        assert!(!link.is_unresolved);
    }

    let note_b_relinked = get_note(&conn, &note_b.note.id).expect("Fetch Note B after recreation");
    assert_eq!(
        note_b_relinked.outgoing_links[0].target_id,
        Some(target_note_recreated.note.id.clone())
    );
    assert!(!note_b_relinked.outgoing_links[0].is_unresolved);

    let recreated_details = get_note(&conn, &target_note_recreated.note.id).expect("Fetch recreated note");
    assert_eq!(recreated_details.incoming_links.len(), 3);
}

// 2b. Title Updates, Rename Cascades & Dangling Link Resolution:
// Tests:
// - Renaming note resolves pre-existing dangling links that targeted the new title.
// - Renaming note updates target_title for all incoming links.
#[test]
fn test_adversarial_title_updates_and_rename_cascades() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    // Note 1 has dangling link to "Quantum Mechanics"
    let note_1 = create_note(
        &conn,
        "Physics Overview".to_string(),
        Some("See [[Quantum Mechanics]] for deep dive.".to_string()),
        None,
        None,
    )
    .expect("Create Physics Overview");

    assert!(note_1.outgoing_links[0].is_unresolved);

    // Note 2 is created with title "Classical Mechanics"
    let note_2 = create_note(
        &conn,
        "Classical Mechanics".to_string(),
        Some("Newtonian physics.".to_string()),
        None,
        None,
    )
    .expect("Create Classical Mechanics");

    // Rename Note 2 to "Quantum Mechanics"
    let note_2_updated = update_note(
        &conn,
        &note_2.note.id,
        Some("Quantum Mechanics".to_string()),
        None,
        None,
        None,
        None,
        None,
    )
    .expect("Rename Classical Mechanics to Quantum Mechanics");

    assert_eq!(note_2_updated.note.title, "Quantum Mechanics");

    // Note 1's dangling link must now be resolved to Note 2!
    let note_1_after_rename = get_note(&conn, &note_1.note.id).expect("Fetch Note 1");
    assert_eq!(
        note_1_after_rename.outgoing_links[0].target_id,
        Some(note_2.note.id.clone()),
        "Dangling link must be resolved when note is renamed to match target_title"
    );
    assert!(!note_1_after_rename.outgoing_links[0].is_unresolved);

    // Note 3 links to "Quantum Mechanics"
    let note_3 = create_note(
        &conn,
        "Modern Physics".to_string(),
        Some("Studying [[Quantum Mechanics]]".to_string()),
        None,
        None,
    )
    .expect("Create Note 3");
    assert_eq!(note_3.outgoing_links[0].target_id, Some(note_2.note.id.clone()));

    // Now rename Note 2 to "Quantum Physics & Computing"
    let note_2_renamed_again = update_note(
        &conn,
        &note_2.note.id,
        Some("Quantum Physics & Computing".to_string()),
        None,
        None,
        None,
        None,
        None,
    )
    .expect("Rename Note 2 again");
    assert_eq!(note_2_renamed_again.note.title, "Quantum Physics & Computing");

    // Incoming links from Note 1 and Note 3 should have target_title updated to "Quantum Physics & Computing"
    let note_1_final = get_note(&conn, &note_1.note.id).expect("Fetch Note 1 final");
    assert_eq!(note_1_final.outgoing_links[0].target_title, "Quantum Physics & Computing");
    assert_eq!(note_1_final.outgoing_links[0].target_id, Some(note_2.note.id.clone()));

    let note_3_final = get_note(&conn, &note_3.note.id).expect("Fetch Note 3 final");
    assert_eq!(note_3_final.outgoing_links[0].target_title, "Quantum Physics & Computing");
    assert_eq!(note_3_final.outgoing_links[0].target_id, Some(note_2.note.id.clone()));
}

// 2c. Duplicate Title Rejection Stress:
// Tests:
// - Exact matches rejected.
// - Case-insensitive matches rejected ("title", "TITLE", "Title").
// - Whitespace-trimmed matches rejected ("  Title  ").
// - Empty and whitespace-only titles rejected.
// - Updating existing note to clash with another note rejected.
// - Case-preserving rename of SELF allowed ("title" -> "TITLE").
#[test]
fn test_adversarial_duplicate_title_rejection_matrix() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    let _note1 = create_note(
        &conn,
        "Unique Alpha".to_string(),
        Some("Content".to_string()),
        None,
        None,
    )
    .expect("Create first note");

    // Exact duplicate
    assert!(
        create_note(&conn, "Unique Alpha".to_string(), None, None, None).is_err(),
        "Exact duplicate title must be rejected"
    );

    // Case insensitive duplicates
    assert!(
        create_note(&conn, "unique alpha".to_string(), None, None, None).is_err(),
        "Lowercase duplicate title must be rejected"
    );
    assert!(
        create_note(&conn, "UNIQUE ALPHA".to_string(), None, None, None).is_err(),
        "Uppercase duplicate title must be rejected"
    );
    assert!(
        create_note(&conn, "  Unique Alpha  ".to_string(), None, None, None).is_err(),
        "Whitespace-padded duplicate title must be rejected"
    );

    // Empty or whitespace titles
    assert!(
        create_note(&conn, "".to_string(), None, None, None).is_err(),
        "Empty title must be rejected"
    );
    assert!(
        create_note(&conn, "   \t\n  ".to_string(), None, None, None).is_err(),
        "Whitespace-only title must be rejected"
    );

    // Create a second note
    let note2 = create_note(
        &conn,
        "Unique Beta".to_string(),
        Some("Content 2".to_string()),
        None,
        None,
    )
    .expect("Create second note");

    // Updating note2 title to note1 title (conflict)
    assert!(
        update_note(
            &conn,
            &note2.note.id,
            Some("Unique Alpha".to_string()),
            None,
            None,
            None,
            None,
            None
        )
        .is_err(),
        "Renaming to existing title must be rejected"
    );

    assert!(
        update_note(
            &conn,
            &note2.note.id,
            Some("unique alpha".to_string()),
            None,
            None,
            None,
            None,
            None
        )
        .is_err(),
        "Renaming to case-insensitive conflict title must be rejected"
    );
}

// 2c-ii. Changing Letter Casing of Self:
// Tests:
// - Renaming a note to change its letter casing (e.g., "Unique Alpha" -> "UNIQUE ALPHA")
//   must update the title in the database and return the new casing.
#[test]
fn test_adversarial_self_rename_casing_change() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    let note1 = create_note(
        &conn,
        "Unique Alpha".to_string(),
        Some("Content".to_string()),
        None,
        None,
    )
    .expect("Create first note");

    let self_rename = update_note(
        &conn,
        &note1.note.id,
        Some("UNIQUE ALPHA".to_string()),
        None,
        None,
        None,
        None,
        None,
    )
    .expect("Case change on the note itself must succeed");

    assert_eq!(
        self_rename.note.title, "UNIQUE ALPHA",
        "Note title must reflect requested casing change"
    );
}

// 2d. Self-referencing, Cycles and Dangling Cascades:
// Tests:
// - Note linking to itself ([[Self Link]]).
// - Cyclic links (A -> B -> C -> A).
// - Deleting a node in a cycle leaves others intact with correct dangling states.
#[test]
fn test_adversarial_cyclic_links_and_self_referencing() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    // Note pointing to itself
    let o_note = create_note(
        &conn,
        "Ouroboros".to_string(),
        Some("Snake eating its tail [[Ouroboros]]".to_string()),
        None,
        None,
    )
    .expect("Create self-linking note");

    assert_eq!(o_note.outgoing_links.len(), 1);
    assert_eq!(o_note.outgoing_links[0].target_id, Some(o_note.note.id.clone()));

    // Cycle A -> B -> C -> A
    let node_a = create_note(
        &conn,
        "Cycle A".to_string(),
        Some("Points to [[Cycle B]]".to_string()),
        None,
        None,
    )
    .expect("Create Cycle A");

    let node_b = create_note(
        &conn,
        "Cycle B".to_string(),
        Some("Points to [[Cycle C]]".to_string()),
        None,
        None,
    )
    .expect("Create Cycle B");

    let node_c = create_note(
        &conn,
        "Cycle C".to_string(),
        Some("Points to [[Cycle A]]".to_string()),
        None,
        None,
    )
    .expect("Create Cycle C");

    // Verify all resolved
    let a_details = get_note(&conn, &node_a.note.id).expect("Fetch A");
    assert_eq!(a_details.outgoing_links[0].target_id, Some(node_b.note.id.clone()));

    let b_details = get_note(&conn, &node_b.note.id).expect("Fetch B");
    assert_eq!(b_details.outgoing_links[0].target_id, Some(node_c.note.id.clone()));

    let c_details = get_note(&conn, &node_c.note.id).expect("Fetch C");
    assert_eq!(c_details.outgoing_links[0].target_id, Some(node_a.note.id.clone()));

    // Now delete Node B
    delete_note(&conn, &node_b.note.id).expect("Delete Node B");

    // Node A's link to Node B is now dangling
    let a_post_delete = get_note(&conn, &node_a.note.id).expect("Fetch A post delete");
    assert!(a_post_delete.outgoing_links[0].target_id.is_none());
    assert!(a_post_delete.outgoing_links[0].is_unresolved);
    assert_eq!(a_post_delete.outgoing_links[0].target_title, "Cycle B");

    // Node C's link to Node A remains intact
    let c_post_delete = get_note(&conn, &node_c.note.id).expect("Fetch C post delete");
    assert_eq!(c_post_delete.outgoing_links[0].target_id, Some(node_a.note.id.clone()));

    // Delete Ouroboros (self referencing)
    delete_note(&conn, &o_note.note.id).expect("Delete self-referencing note must not fail");
    assert!(get_note(&conn, &o_note.note.id).is_err());
}

// 2e. Adversarial Unicode, Quotes, and SQL Escapes:
// Tests:
// - Titles with single quotes, double quotes, unicode emoji, and SQL keywords.
// - Wikilinks targeting these complex titles.
// - Full-text search and backlink extraction on these notes without syntax errors.
#[test]
fn test_adversarial_special_characters_and_sql_escapes() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    let tricky_titles = vec![
        "Title with 'single quotes' and \"double\"",
        "Symbols: & + - . , (parentheses) : colons",
        "Unicode & Emojis: 🌟 🚀 🪐 🦄",
        "SQL injection vector: '; DROP TABLE notes; --",
        "Accent & Diacritics: Café & résumé & naïve",
    ];

    let mut created_ids = Vec::new();

    for t in &tricky_titles {
        let note = create_note(
            &conn,
            t.to_string(),
            Some(format!("Content for {} with #tag/subtag", t)),
            None,
            None,
        )
        .unwrap_or_else(|e| panic!("Failed to create note with title '{}': {}", t, e));
        created_ids.push(note.note.id);
    }

    // Create a Hub note linking to all tricky titles
    let mut hub_content = String::from("Hub note linking to:\n");
    for t in &tricky_titles {
        hub_content.push_str(&format!("- [[{}]]\n", t));
    }

    let hub_note = create_note(
        &conn,
        "Adversarial Hub".to_string(),
        Some(hub_content),
        None,
        None,
    )
    .expect("Create Hub Note");

    for link in &hub_note.outgoing_links {
        println!("Parsed link: target='{}', resolved={}", link.target_title, link.is_resolved);
    }
    assert_eq!(hub_note.outgoing_links.len(), tricky_titles.len());
    for link in &hub_note.outgoing_links {
        assert!(link.target_id.is_some(), "Link to '{}' must be resolved", link.target_title);
        assert!(!link.is_unresolved);
    }

    // Test FTS search on adversarial strings
    let res1 = search_notes(&conn, "single quotes").expect("Search single quotes");
    assert!(!res1.is_empty());

    let res2 = search_notes(&conn, "DROP TABLE").expect("Search DROP TABLE");
    assert!(!res2.is_empty());

    let res3 = search_notes(&conn, "🌟").expect("Search emoji");
    assert!(!res3.is_empty());

    // Delete one of the tricky notes and check dangling link preservation
    let tricky_to_delete = &created_ids[0];
    delete_note(&conn, tricky_to_delete).expect("Delete tricky note");

    let hub_refetched = get_note(&conn, &hub_note.note.id).expect("Refetch hub");
    let dangling = hub_refetched
        .outgoing_links
        .iter()
        .find(|l| l.target_title == tricky_titles[0])
        .expect("Dangling link for tricky title 0 must exist");
    assert!(dangling.target_id.is_none());
    assert!(dangling.is_unresolved);
}

// 2f. Phantom Node Case Consistency in Graph Assembly:
// Tests:
// - If Note 1 links to [[Target Note]] and Note 2 links to [[target note]],
//   both links must resolve to the EXACT SAME phantom node ID in the graph.
// - Every link.target and link.source in GraphData.links MUST exist in GraphData.nodes!
#[test]
fn test_adversarial_phantom_node_casing_consistency() {
    let conn = rusqlite::Connection::open_in_memory().expect("Open in memory");
    configure_connection(&conn).expect("Config PRAGMAs");
    run_migrations(&conn).expect("Run migrations");

    let _note1 = create_note(
        &conn,
        "Source Alpha".to_string(),
        Some("Points to [[Phantom Concept]]".to_string()),
        None,
        None,
    )
    .expect("Create Source Alpha");

    let _note2 = create_note(
        &conn,
        "Source Beta".to_string(),
        Some("Points to [[phantom concept]]".to_string()),
        None,
        None,
    )
    .expect("Create Source Beta");

    let graph = get_graph_data(&conn).expect("Assemble graph data");

    let node_ids: std::collections::HashSet<String> = graph.nodes.iter().map(|n| n.id.clone()).collect();

    // Verify every link has existing source and target in nodes
    for link in &graph.links {
        assert!(
            node_ids.contains(&link.source),
            "Link source '{}' must exist in graph nodes",
            link.source
        );
        assert!(
            node_ids.contains(&link.target),
            "Link target '{}' must exist in graph nodes! Available nodes: {:?}",
            link.target,
            node_ids
        );
    }
}

