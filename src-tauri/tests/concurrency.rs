use std::sync::Arc;
use std::thread;
use hoshinote_lib::services::{create_note, get_graph_data, search_notes};
use hoshinote_lib::state::AppState;

#[test]
fn test_multithreaded_app_state_concurrency() {
    let state = Arc::new(AppState::in_memory().expect("In-memory AppState should initialize"));

    let mut handles = Vec::new();

    // 10 writer threads
    for t in 0..10 {
        let state_clone = Arc::clone(&state);
        handles.push(thread::spawn(move || {
            for i in 0..15 {
                let title = format!("Thread {} Note {}", t, i);
                let content = format!("Content for note {} from thread {}. #thread{} [[Thread 0 Note 0]]", i, t, t);
                let conn = state_clone.db.lock().expect("Lock db");
                create_note(&conn, title, Some(content), None, None).expect("Create note in thread");
            }
        }));
    }

    // 5 reader/searcher threads
    for _ in 0..5 {
        let state_clone = Arc::clone(&state);
        handles.push(thread::spawn(move || {
            for _ in 0..10 {
                let conn = state_clone.db.lock().expect("Lock db");
                let _ = search_notes(&conn, "Content");
                let _ = get_graph_data(&conn);
            }
        }));
    }

    for h in handles {
        h.join().expect("Thread should not panic");
    }

    let conn = state.db.lock().expect("Lock db");
    let graph = get_graph_data(&conn).expect("Get graph data");
    assert_eq!(graph.nodes.len(), 150, "All 150 notes must be present");
}
