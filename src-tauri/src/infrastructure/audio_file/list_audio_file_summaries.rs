use crate::infrastructure::audio_file::AudioFileSummary;
use crate::infrastructure::database::AppDb;
use tauri::State;

pub fn list_audio_file_summaries(db: &State<'_, AppDb>) -> Result<Vec<AudioFileSummary>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, original_extension, original_mime_type, created_at
             FROM audio_files
             ORDER BY created_at DESC",
        )
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
