use crate::infrastructure::audio_file::{save_recording_data, SaveRecordingResponse};
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn save_recording(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDb>,
    name: String,
    bytes: Vec<u8>,
    mime_type: String,
    extension: String,
) -> Result<SaveRecordingResponse, String> {
    save_recording_data(app_handle, db, name, bytes, mime_type, extension)
}
