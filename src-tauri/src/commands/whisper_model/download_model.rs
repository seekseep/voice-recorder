use std::fs;
use std::io::{Read, Write};
use tauri::Manager;

const MODEL_URL: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin";

#[tauri::command]
pub fn download_whisper_model(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let models_dir = app_data_dir.join("models");
    fs::create_dir_all(&models_dir).map_err(|e| format!("Failed to create models dir: {e}"))?;

    let model_path = models_dir.join("ggml-medium.bin");

    // Download using HTTP
    let response = ureq::get(MODEL_URL)
        .call()
        .map_err(|e| format!("Download failed: {e}"))?;

    let mut file =
        fs::File::create(&model_path).map_err(|e| format!("Failed to create file: {e}"))?;

    let mut reader = response.into_body().into_reader();
    let mut buf = vec![0u8; 1024 * 1024]; // 1MB buffer
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("Read error: {e}"))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])
            .map_err(|e| format!("Write error: {e}"))?;
    }

    Ok(model_path.to_string_lossy().to_string())
}
