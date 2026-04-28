use crate::infrastructure::audio_file::read_converted_file_bytes;
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn get_converted_file_bytes(
    db: State<'_, AppDb>,
    id: String,
    extension: String,
) -> Result<Vec<u8>, String> {
    read_converted_file_bytes(&db, &id, &extension)
}
