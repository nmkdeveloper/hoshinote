pub mod graph_commands;
pub mod note_commands;

pub use graph_commands::*;
pub use note_commands::*;

#[tauri::command]
pub fn get_app_status() -> Result<String, String> {
    Ok("Hoshinote core online".to_string())
}
