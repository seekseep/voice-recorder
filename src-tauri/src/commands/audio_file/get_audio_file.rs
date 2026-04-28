use crate::infrastructure::audio_file::{find_audio_file_detail, AudioFileDetail};
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn get_audio_file(db: State<'_, AppDb>, id: String) -> Result<AudioFileDetail, String> {
    find_audio_file_detail(&db, &id)
}
