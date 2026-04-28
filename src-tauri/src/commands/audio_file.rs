use crate::db::AppDb;
use chrono::Utc;
use serde::Serialize;
use std::fs;
use tauri::{Manager, State};
use uuid::Uuid;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRecordingResponse {
    pub id: String,
    pub stored_path: String,
    pub original_mime_type: String,
    pub original_extension: String,
}

#[tauri::command]
pub fn save_recording(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDb>,
    name: String,
    bytes: Vec<u8>,
    mime_type: String,
    extension: String,
) -> Result<SaveRecordingResponse, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Build storage directory: {app_data}/audio_files/{id}/
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let file_dir = app_data_dir.join("audio_files").join(&id);
    fs::create_dir_all(&file_dir).map_err(|e| format!("Failed to create directory: {e}"))?;

    let file_name = format!("original.{extension}");
    let file_path = file_dir.join(&file_name);

    // Write audio bytes to disk
    fs::write(&file_path, &bytes).map_err(|e| format!("Failed to write file: {e}"))?;

    let stored_path_str = file_path
        .to_str()
        .ok_or("Invalid path encoding")?
        .to_string();

    // Insert metadata into SQLite
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
        conn.execute(
            "INSERT INTO audio_files (id, name, original_extension, original_mime_type, stored_path, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (
                &id,
                &name,
                &extension,
                &mime_type,
                &stored_path_str,
                &now,
                &now,
            ),
        )
        .map_err(|e| format!("DB insert error: {e}"))?;
    }

    Ok(SaveRecordingResponse {
        id,
        stored_path: stored_path_str,
        original_mime_type: mime_type,
        original_extension: extension,
    })
}
