use rusqlite::Connection;
use crate::services::note_service::*;
use crate::services::graph_service::*;

fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("In-memory db must open");
    crate::db::connection::configure_connection(&conn).expect("Pragmas must apply");
    crate::db::schema::run_migrations(&conn).expect("Migrations must succeed");
    conn
}

#[test]
fn test_create_and_get_note_crud() {
    let conn = setup_test_db();
    let created = create_note(
        &conn,
        "Quantum Computing".to_string(),
        Some("Qubits and entanglement. #quantum #physics".to_string()),
        Some("/physics".to_string()),
        Some(vec!["computing".to_string()]),
    )
    .expect("Create note");

    assert_eq!(created.note.title, "Quantum Computing");
    assert_eq!(created.note.path, "/physics");
    assert!(created.tags.contains(&"quantum".to_string()));
    assert!(created.tags.contains(&"physics".to_string()));
    assert!(created.tags.contains(&"computing".to_string()));

    let fetched = get_note(&conn, &created.note.id).expect("Get note");
    assert_eq!(fetched.note.id, created.note.id);
    assert_eq!(fetched.note.title, "Quantum Computing");

    let by_title = get_note_by_title(&conn, "quantum computing")
        .expect("Get by title")
        .expect("Should find note");
    assert_eq!(by_title.note.id, created.note.id);
}

#[test]
fn test_duplicate_title_rejected() {
    let conn = setup_test_db();
    create_note(
        &conn,
        "Unique Title".to_string(),
        Some("Content".to_string()),
        None,
        None,
    )
    .expect("Create note");

    let err = create_note(
        &conn,
        "unique title".to_string(),
        Some("Different content".to_string()),
        None,
        None,
    );
    assert!(err.is_err(), "Duplicate title must be rejected");
}

#[test]
fn test_dangling_link_resolution_on_create() {
    let conn = setup_test_db();
    // Create note A linking to future Note B
    let note_a = create_note(
        &conn,
        "Note A".to_string(),
        Some("Links to [[Note B]].".to_string()),
        None,
        None,
    )
    .expect("Create A");

    assert_eq!(note_a.outgoing_links.len(), 1);
    assert!(note_a.outgoing_links[0].is_unresolved);
    assert_eq!(note_a.outgoing_links[0].target_id, None);

    // Now create Note B
    let note_b = create_note(
        &conn,
        "Note B".to_string(),
        Some("Target note.".to_string()),
        None,
        None,
    )
    .expect("Create B");

    // Reload Note A: outgoing link should now be resolved
    let note_a_reloaded = get_note(&conn, &note_a.note.id).expect("Reload A");
    assert_eq!(note_a_reloaded.outgoing_links.len(), 1);
    assert!(!note_a_reloaded.outgoing_links[0].is_unresolved);
    assert_eq!(note_a_reloaded.outgoing_links[0].target_id, Some(note_b.note.id.clone()));

    // Backlinks of Note B should include Note A
    let backlinks_b = get_backlinks(&conn, &note_b.note.id).expect("Backlinks of B");
    assert_eq!(backlinks_b.len(), 1);
    assert_eq!(backlinks_b[0].source_id, note_a.note.id);
}

#[test]
fn test_update_note_content_sync() {
    let conn = setup_test_db();
    let note = create_note(
        &conn,
        "Mutable Note".to_string(),
        Some("Initial #draft".to_string()),
        None,
        None,
    )
    .expect("Create");

    assert_eq!(note.tags, vec!["draft".to_string()]);

    let updated = update_note(
        &conn,
        &note.note.id,
        Some("Renamed Note".to_string()),
        Some("New content #published #v1 [[External Note]]".to_string()),
        None,
        None,
        Some(true),
        None,
    )
    .expect("Update");

    assert_eq!(updated.note.title, "Renamed Note");
    assert!(updated.note.is_pinned);
    assert!(updated.tags.contains(&"published".to_string()));
    assert!(updated.tags.contains(&"v1".to_string()));
    assert!(!updated.tags.contains(&"draft".to_string()));
    assert_eq!(updated.outgoing_links.len(), 1);
    assert_eq!(updated.outgoing_links[0].target_title, "External Note");
}

#[test]
fn test_delete_note_cascades_and_dangles() {
    let conn = setup_test_db();
    let target = create_note(&conn, "Target".to_string(), Some("Body".to_string()), None, None).unwrap();
    let source = create_note(&conn, "Source".to_string(), Some("See [[Target]]".to_string()), None, None).unwrap();

    assert_eq!(source.outgoing_links[0].target_id, Some(target.note.id.clone()));

    // Delete target
    delete_note(&conn, &target.note.id).unwrap();

    // Source link should now be dangling
    let source_reloaded = get_note(&conn, &source.note.id).unwrap();
    assert_eq!(source_reloaded.outgoing_links.len(), 1);
    assert!(source_reloaded.outgoing_links[0].is_unresolved);
    assert_eq!(source_reloaded.outgoing_links[0].target_id, None);
}

#[test]
fn test_list_notes_filtering() {
    let conn = setup_test_db();
    create_note(&conn, "Alpha".to_string(), Some("#topic content".to_string()), None, None).unwrap();
    create_note(&conn, "Beta".to_string(), Some("#other content".to_string()), None, None).unwrap();
    let gamma = create_note(&conn, "Gamma".to_string(), Some("#topic content".to_string()), None, None).unwrap();

    update_note(&conn, &gamma.note.id, None, None, None, None, None, Some(true)).unwrap();

    let filtered = list_notes(&conn, Some("topic".to_string()), Some(false), None, None, None, None).unwrap();
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].title, "Alpha");

    let archived = list_notes(&conn, None, Some(true), None, None, None, None).unwrap();
    assert_eq!(archived.len(), 1);
    assert_eq!(archived[0].title, "Gamma");
}

#[test]
fn test_graph_data_assembly() {
    let conn = setup_test_db();
    let n1 = create_note(&conn, "Node 1".to_string(), Some("Links to [[Node 2]] and [[Dangling]]".to_string()), None, None).unwrap();
    let n2 = create_note(&conn, "Node 2".to_string(), Some("Links to [[Node 1]]".to_string()), None, None).unwrap();
    create_note(&conn, "Orphan".to_string(), Some("No links".to_string()), None, None).unwrap();

    let graph = get_graph_data(&conn).expect("Get graph");
    // 3 real notes + 1 phantom note "unresolved:Dangling"
    assert_eq!(graph.nodes.len(), 4);

    let n1_node = graph.nodes.iter().find(|n| n.id == n1.note.id).unwrap();
    let n2_node = graph.nodes.iter().find(|n| n.id == n2.note.id).unwrap();
    let orphan_node = graph.nodes.iter().find(|n| n.title == "Orphan").unwrap();
    let phantom = graph.nodes.iter().find(|n| n.is_unresolved).unwrap();

    assert_eq!(n1_node.connections_count, 3); // outgoing to 2, outgoing to dangling, incoming from 2
    assert_eq!(n2_node.connections_count, 2); // incoming from 1, outgoing to 1
    assert!(orphan_node.is_orphan);
    assert_eq!(phantom.id, "unresolved:Dangling");
    assert_eq!(phantom.group, "draft");

    assert_eq!(graph.links.len(), 3);
}
