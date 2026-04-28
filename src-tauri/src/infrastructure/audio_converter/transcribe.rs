use std::path::Path;
use std::process::Command;

pub fn transcribe_audio(
    input_path: &Path,
    model_path: &Path,
    language: &str,
) -> Result<String, String> {
    // Convert to WAV (16kHz mono) for whisper-cli
    let wav_path = input_path
        .parent()
        .ok_or("Invalid input path")?
        .join("temp_whisper.wav");

    let ffmpeg_output = Command::new("ffmpeg")
        .args([
            "-i",
            input_path.to_str().ok_or("Invalid input path")?,
            "-ar",
            "16000",
            "-ac",
            "1",
            "-y",
            wav_path.to_str().ok_or("Invalid wav path")?,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {e}"))?;

    if !ffmpeg_output.status.success() {
        let stderr = String::from_utf8_lossy(&ffmpeg_output.stderr);
        return Err(format!("ffmpeg WAV conversion failed: {stderr}"));
    }

    // Run whisper-cli
    let whisper_output = Command::new("whisper-cli")
        .args([
            "-m",
            model_path.to_str().ok_or("Invalid model path")?,
            "-f",
            wav_path.to_str().ok_or("Invalid wav path")?,
            "-l",
            language,
            "--no-timestamps",
        ])
        .output()
        .map_err(|e| format!("Failed to run whisper-cli: {e}"))?;

    // Clean up temp WAV
    let _ = std::fs::remove_file(&wav_path);

    if !whisper_output.status.success() {
        let stderr = String::from_utf8_lossy(&whisper_output.stderr);
        return Err(format!("whisper-cli failed: {stderr}"));
    }

    // Parse output: skip whisper log lines, extract actual transcription
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
