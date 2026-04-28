use std::fs;
use std::path::Path;

pub fn delete_audio_file_assets(stored_path: &str) -> Result<(), String> {
    let file_path = Path::new(stored_path);
    if let Some(dir) = file_path.parent() {
        fs::remove_dir_all(dir).map_err(|e| format!("Failed to delete audio file directory: {e}"))?;
    }
    Ok(())
}
