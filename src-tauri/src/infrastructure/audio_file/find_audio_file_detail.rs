use crate::infrastructure::audio_file::AudioFileDetail;
use crate::infrastructure::database::AppDb;
use tauri::State;

pub fn find_audio_file_detail(db: &State<'_, AppDb>, id: &str) -> Result<AudioFileDetail, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    conn.query_row(
        "SELECT id, name, original_extension, original_mime_type, stored_path, created_at, updated_at
         FROM audio_files
         WHERE id = ?1",
        [id],
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
