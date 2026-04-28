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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileSummary {
    pub id: String,
    pub name: String,
    pub original_extension: String,
    pub original_mime_type: String,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileDetail {
    pub id: String,
    pub name: String,
    pub original_extension: String,
    pub original_mime_type: String,
    pub stored_path: String,
    pub created_at: String,
    pub updated_at: String,
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

#[tauri::command]
pub fn list_audio_files(db: State<'_, AppDb>) -> Result<Vec<AudioFileSummary>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, name, original_extension, original_mime_type, created_at FROM audio_files ORDER BY created_at DESC")
        .map_err(|e| format!("DB query error: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AudioFileSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                original_extension: row.get(2)?,
                original_mime_type: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("DB query error: {e}"))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| format!("DB row error: {e}"))?);
    }
    Ok(results)
}

#[tauri::command]
pub fn get_audio_file(db: State<'_, AppDb>, id: String) -> Result<AudioFileDetail, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    conn.query_row(
        "SELECT id, name, original_extension, original_mime_type, stored_path, created_at, updated_at FROM audio_files WHERE id = ?1",
        [&id],
        |row| {
            Ok(AudioFileDetail {
                id: row.get(0)?,
                name: row.get(1)?,
                original_extension: row.get(2)?,
                original_mime_type: row.get(3)?,
                stored_path: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| format!("Audio file not found: {e}"))
}

#[tauri::command]
pub fn delete_audio_file(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDb>,
    id: String,
) -> Result<(), String> {
    // Get stored path before deleting
    let stored_path: String = {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
        conn.query_row(
            "SELECT stored_path FROM audio_files WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Audio file not found: {e}"))?
    };

    // Delete file directory
    let file_path = std::path::Path::new(&stored_path);
    if let Some(dir) = file_path.parent() {
        let _ = fs::remove_dir_all(dir);
    }

    // Delete DB record
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
        conn.execute("DELETE FROM audio_files WHERE id = ?1", [&id])
            .map_err(|e| format!("DB delete error: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_audio_file_bytes(db: State<'_, AppDb>, id: String) -> Result<Vec<u8>, String> {
    let stored_path: String = {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
        conn.query_row(
            "SELECT stored_path FROM audio_files WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Audio file not found: {e}"))?
    };

    fs::read(&stored_path).map_err(|e| format!("Failed to read file: {e}"))
}
