use crate::infrastructure::audio_file::{list_audio_file_summaries, AudioFileSummary};
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn list_audio_files(db: State<'_, AppDb>) -> Result<Vec<AudioFileSummary>, String> {
    list_audio_file_summaries(&db)
}
