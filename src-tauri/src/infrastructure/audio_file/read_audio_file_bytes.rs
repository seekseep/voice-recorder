use std::fs;

pub fn read_audio_file_bytes(stored_path: &str) -> Result<Vec<u8>, String> {
    fs::read(stored_path).map_err(|e| format!("Failed to read file: {e}"))
}
