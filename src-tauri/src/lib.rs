mod commands;
mod db;

use db::AppDb;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data dir");

            let db_path = app_data_dir.join("voice_recorder.db");
            let db = AppDb::open(&db_path).expect("Failed to open database");
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::audio_file::save_recording,
            commands::audio_file::list_audio_files,
            commands::audio_file::get_audio_file,
            commands::audio_file::delete_audio_file,
            commands::audio_file::get_audio_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
