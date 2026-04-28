use crate::infrastructure::audio_file::{delete_audio_file_assets, delete_audio_file_record, find_audio_file_stored_path};
use crate::infrastructure::database::AppDb;
use tauri::State;

#[tauri::command]
pub fn delete_audio_file(db: State<'_, AppDb>, id: String) -> Result<(), String> {
    let stored_path = find_audio_file_stored_path(&db, &id)?;
    delete_audio_file_assets(&stored_path)?;
    delete_audio_file_record(&db, &id)
}
