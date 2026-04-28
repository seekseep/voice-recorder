use std::path::Path;
use std::process::Command;

pub fn convert_to_mp3(input_path: &Path, output_path: &Path) -> Result<(), String> {
    // Remove existing output if any
    let _ = std::fs::remove_file(output_path);

    let status = Command::new("ffmpeg")
        .args([
            "-i",
            input_path
                .to_str()
                .ok_or("Invalid input path")?,
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "2",
            "-y",
            output_path
                .to_str()
                .ok_or("Invalid output path")?,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {e}"))?;

    if !status.status.success() {
        let stderr = String::from_utf8_lossy(&status.stderr);
        return Err(format!("ffmpeg failed: {stderr}"));
    }

    Ok(())
}
