use crate::infrastructure::database::AppDb;
use tauri::State;

pub fn find_audio_file_stored_path(db: &State<'_, AppDb>, id: &str) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    conn.query_row(
        "SELECT stored_path FROM audio_files WHERE id = ?1",
        [id],
        |row| row.get(0),
    )
    .map_err(|e| format!("Audio file not found: {e}"))
}
