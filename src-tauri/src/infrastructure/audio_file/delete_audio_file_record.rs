use crate::infrastructure::database::AppDb;
use tauri::State;

pub fn delete_audio_file_record(db: &State<'_, AppDb>, id: &str) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    conn.execute("DELETE FROM audio_files WHERE id = ?1", [id])
        .map_err(|e| format!("DB delete error: {e}"))?;
    Ok(())
}
