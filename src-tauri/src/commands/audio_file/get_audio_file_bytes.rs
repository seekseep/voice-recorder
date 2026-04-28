use crate::infrastructure::audio_file::{find_audio_file_stored_path, read_audio_file_bytes};
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn get_audio_file_bytes(db: State<'_, AppDb>, id: String) -> Result<Vec<u8>, String> {
    let stored_path = find_audio_file_stored_path(&db, &id)?;
    read_audio_file_bytes(&stored_path)
}
