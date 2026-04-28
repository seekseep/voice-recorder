use crate::infrastructure::audio_file::SaveRecordingResponse;
use crate::infrastructure::database::AppDb;
use tauri::State;

pub fn insert_audio_file_record(
    db: &State<'_, AppDb>,
    id: &str,
    name: &str,
    extension: &str,
    mime_type: &str,
    stored_path: &str,
    wav_path: Option<&str>,
    now: &str,
) -> Result<SaveRecordingResponse, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    conn.execute(
        "INSERT INTO audio_files (id, name, original_extension, original_mime_type, stored_path, wav_path, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (id, name, extension, mime_type, stored_path, wav_path, now, now),
    )
    .map_err(|e| format!("DB insert error: {e}"))?;

    Ok(SaveRecordingResponse {
        id: id.to_string(),
        stored_path: stored_path.to_string(),
        original_mime_type: mime_type.to_string(),
        original_extension: extension.to_string(),
    })
}
