use super::convert_to_wav;
use std::path::Path;
use std::process::Command;
use tauri::Manager;

/// Transcribe an audio file using the bundled whisper-cli sidecar.
pub fn transcribe_audio(
    app_handle: &tauri::AppHandle,
    input_path: &Path,
    model_path: &Path,
    language: &str,
    wav_path: Option<&Path>,
) -> Result<String, String> {
    // Use existing WAV or convert
    let wav_to_use;
    let temp_wav;

    if let Some(wp) = wav_path {
        if wp.exists() {
            wav_to_use = wp.to_path_buf();
            temp_wav = false;
        } else {
            convert_to_wav(input_path, wp)?;
            wav_to_use = wp.to_path_buf();
            temp_wav = false;
        }
    } else {
        let tmp = input_path
            .parent()
            .ok_or("Invalid input path")?
            .join("temp_whisper.wav");
        convert_to_wav(input_path, &tmp)?;
        wav_to_use = tmp;
        temp_wav = true;
    }

    // Resolve whisper-cli sidecar path
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {e}"))?;

    // In dev mode, the sidecar is in src-tauri/binaries/
    // In production, Tauri places it alongside the app binary
    let whisper_path = {
        let sidecar = resource_dir.join("binaries").join(format!(
            "whisper-cli-{}",
            current_target_triple()
        ));
        if sidecar.exists() {
            sidecar
        } else {
            // Fallback to system PATH
            std::path::PathBuf::from("whisper-cli")
        }
    };

    let whisper_output = Command::new(&whisper_path)
        .env(
            "DYLD_LIBRARY_PATH",
            whisper_path.parent().unwrap_or(Path::new(".")),
        )
        .args([
            "-m",
            model_path.to_str().ok_or("Invalid model path")?,
            "-f",
            wav_to_use.to_str().ok_or("Invalid wav path")?,
            "-l",
            language,
            "--no-timestamps",
        ])
        .output()
        .map_err(|e| format!("Failed to run whisper-cli: {e}"))?;

    if temp_wav {
        let _ = std::fs::remove_file(&wav_to_use);
    }

    if !whisper_output.status.success() {
        let stderr = String::from_utf8_lossy(&whisper_output.stderr);
        return Err(format!("whisper-cli failed: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&whisper_output.stdout);
    let text: String = stdout
        .lines()
        .filter(|line| {
            !line.starts_with("whisper_")
                && !line.starts_with("ggml_")
                && !line.starts_with("load_backend")
                && !line.starts_with("system_info")
                && !line.starts_with("main:")
                && !line.is_empty()
        })
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string();

    Ok(text)
}

fn current_target_triple() -> &'static str {
    if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
        "aarch64-apple-darwin"
    } else if cfg!(target_os = "macos") && cfg!(target_arch = "x86_64") {
        "x86_64-apple-darwin"
    } else if cfg!(target_os = "windows") {
        "x86_64-pc-windows-msvc"
    } else {
        "x86_64-unknown-linux-gnu"
    }
}
