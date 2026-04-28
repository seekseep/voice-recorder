use crate::infrastructure::audio_file::insert_audio_file_record;
use crate::infrastructure::audio_file::SaveRecordingResponse;
use crate::infrastructure::database::AppDb;
use chrono::Utc;
use std::fs;
use tauri::{Manager, State};
use uuid::Uuid;

pub fn save_recording_data(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDb>,
    name: String,
    bytes: Vec<u8>,
    mime_type: String,
    extension: String,
) -> Result<SaveRecordingResponse, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let file_dir = app_data_dir.join("audio_files").join(&id);
    fs::create_dir_all(&file_dir).map_err(|e| format!("Failed to create directory: {e}"))?;

    let file_name = format!("original.{extension}");
    let file_path = file_dir.join(&file_name);
    fs::write(&file_path, &bytes).map_err(|e| format!("Failed to write file: {e}"))?;

    let stored_path = file_path
        .to_str()
        .ok_or("Invalid path encoding")?
        .to_string();

    insert_audio_file_record(
        &db,
        &id,
        &name,
        &extension,
        &mime_type,
        &stored_path,
        &now,
    )
}
