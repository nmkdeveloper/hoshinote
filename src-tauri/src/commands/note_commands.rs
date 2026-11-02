use tauri::State;
use crate::models::{BacklinkItem, NoteSummary, NoteWithDetails, SearchResult, TagSummary};
use crate::services;
use crate::state::AppState;

#[tauri::command(rename_all = "snake_case")]
pub fn create_note(
    state: State<'_, AppState>,
    title: String,
    content: Option<String>,
    path: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<NoteWithDetails, String> {
    let res = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        services::create_note(&conn, title, content, path, tags)?
    };
    let _ = state.save_and_encrypt();
    Ok(res)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<NoteWithDetails, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::get_note(&conn, &id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_note_by_title(
    state: State<'_, AppState>,
    title: String,
) -> Result<Option<NoteWithDetails>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::get_note_by_title(&conn, &title)
}

#[tauri::command(rename_all = "snake_case")]
#[allow(clippy::too_many_arguments)]
pub fn update_note(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    path: Option<String>,
    tags: Option<Vec<String>>,
    is_pinned: Option<bool>,
    is_archived: Option<bool>,
) -> Result<NoteWithDetails, String> {
    let res = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        services::update_note(&conn, &id, title, content, path, tags, is_pinned, is_archived)?
    };
    let _ = state.save_and_encrypt();
    Ok(res)
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        services::delete_note(&conn, &id)?;
    }
    let _ = state.save_and_encrypt();
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
#[allow(clippy::too_many_arguments)]
pub fn list_notes(
    state: State<'_, AppState>,
    tag: Option<String>,
    is_archived: Option<bool>,
    sort_by: Option<String>,
    order: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<NoteSummary>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::list_notes(&conn, tag, is_archived, sort_by, order, limit, offset)
}

#[tauri::command(rename_all = "snake_case")]
pub fn search_notes(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::search_notes(&conn, &query)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_backlinks(
    state: State<'_, AppState>,
    note_id: String,
) -> Result<Vec<BacklinkItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::get_backlinks(&conn, &note_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_all_tags(
    state: State<'_, AppState>,
) -> Result<Vec<TagSummary>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::get_all_tags(&conn)
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct EncryptionStatus {
    pub is_encrypted: bool,
    pub algorithm: String,
    pub vault_file: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_db_encryption_status(state: State<'_, AppState>) -> Result<EncryptionStatus, String> {
    let vault_file = state
        .db_path
        .as_ref()
        .map(|p| p.with_extension("db.enc").to_string_lossy().to_string());
    Ok(EncryptionStatus {
        is_encrypted: true,
        algorithm: "AES-256-GCM".to_string(),
        vault_file,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn encrypt_db(state: State<'_, AppState>) -> Result<String, String> {
    state.save_and_encrypt()
}
