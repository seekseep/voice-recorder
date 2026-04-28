use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub exists: bool,
    pub model_name: String,
    pub model_path: String,
}

#[tauri::command]
pub fn check_whisper_model(app_handle: tauri::AppHandle) -> Result<ModelStatus, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let model_path = app_data_dir.join("models").join("ggml-medium.bin");

    Ok(ModelStatus {
        exists: model_path.exists(),
        model_name: "ggml-medium.bin".to_string(),
        model_path: model_path.to_string_lossy().to_string(),
    })
}
