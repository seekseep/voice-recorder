use crate::infrastructure::audio_file::{convert_audio_file_to_mp3, ConvertResult};
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn convert_audio_file(
    db: State<'_, AppDb>,
    id: String,
    target_format: String,
) -> Result<ConvertResult, String> {
    convert_audio_file_to_mp3(&db, &id, &target_format)
}
