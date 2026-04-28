use crate::infrastructure::audio_file::find_audio_file_stored_path;
use crate::infrastructure::database::AppDb;
use std::fs;
use std::path::Path;
use tauri::State;

pub fn read_converted_file_bytes(
    db: &State<'_, AppDb>,
    id: &str,
    extension: &str,
) -> Result<Vec<u8>, String> {
    let stored_path = find_audio_file_stored_path(db, id)?;
    let input_path = Path::new(&stored_path);

    let converted_path = input_path
        .parent()
        .ok_or("Invalid stored path")?
        .join(format!("converted.{extension}"));

    fs::read(&converted_path).map_err(|e| format!("Converted file not found: {e}"))
}
