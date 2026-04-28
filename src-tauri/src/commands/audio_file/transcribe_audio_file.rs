use crate::infrastructure::audio_converter::transcribe_audio;
use crate::infrastructure::audio_file::find_audio_file_detail;
use crate::infrastructure::database::AppDb;
use chrono::Utc;
use std::path::Path;
use tauri::{Manager, State};

#[tauri::command]
pub fn transcribe_audio_file(
    app_handle: tauri::AppHandle,
    db: State<'_, AppDb>,
    id: String,
    language: String,
) -> Result<String, String> {
    let detail = find_audio_file_detail(&db, &id)?;
    let input_path = Path::new(&detail.stored_path);

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let model_path = app_data_dir.join("models").join("ggml-medium.bin");

    if !model_path.exists() {
        return Err("Whisper model not found. Place ggml-medium.bin in the models directory.".into());
    }

    let wav_path = detail.wav_path.as_deref().map(Path::new);

    let text = transcribe_audio(&app_handle, input_path, &model_path, &language, wav_path)?;

    // Save to DB
    let now = Utc::now().to_rfc3339();
    {
        let conn = db.conn.lock().map_err(|e| format!("DB lock error: {e}"))?;
        conn.execute(
            "UPDATE audio_files SET text_content = ?1, updated_at = ?2 WHERE id = ?3",
            (&text, &now, &id),
        )
        .map_err(|e| format!("DB update error: {e}"))?;
    }

    Ok(text)
}
