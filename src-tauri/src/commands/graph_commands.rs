use tauri::State;
use crate::models::GraphData;
use crate::services;
use crate::state::AppState;

#[tauri::command(rename_all = "snake_case")]
pub fn get_graph_data(
    state: State<'_, AppState>,
) -> Result<GraphData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    services::get_graph_data(&conn)
}
