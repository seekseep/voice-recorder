use crate::infrastructure::audio_converter::convert_to_mp3;
use crate::infrastructure::audio_file::{find_audio_file_stored_path, ConvertResult};
use crate::infrastructure::database::AppDb;
use std::path::Path;
use tauri::State;

pub fn convert_audio_file_to_mp3(
    db: &State<'_, AppDb>,
    id: &str,
    target_format: &str,
) -> Result<ConvertResult, String> {
    if target_format != "mp3" {
        return Err(format!("Unsupported target format: {target_format}"));
    }

    let stored_path = find_audio_file_stored_path(db, id)?;
    let input_path = Path::new(&stored_path);

    let output_path = input_path
        .parent()
        .ok_or("Invalid stored path")?
        .join(format!("converted.{target_format}"));

    convert_to_mp3(input_path, &output_path)?;

    let output_str = output_path
        .to_str()
        .ok_or("Invalid output path encoding")?
        .to_string();

    Ok(ConvertResult {
        converted_path: output_str,
        target_extension: target_format.to_string(),
    })
}
