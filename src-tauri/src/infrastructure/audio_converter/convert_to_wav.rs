use hound::{SampleFormat, WavSpec, WavWriter};
use matroska_demuxer::{Frame, MatroskaFile, TrackType};
use std::fs;
use std::path::Path;

/// Convert a WebM(Opus) file to WAV (16kHz mono, 16-bit PCM).
pub fn convert_to_wav(input_path: &Path, output_path: &Path) -> Result<(), String> {
    let file = fs::File::open(input_path).map_err(|e| format!("Failed to open input: {e}"))?;
    let mut mkv =
        MatroskaFile::open(file).map_err(|e| format!("Failed to parse WebM: {e}"))?;

    let audio_track = mkv
        .tracks()
        .iter()
        .find(|t| t.track_type() == TrackType::Audio)
        .ok_or("No audio track found in WebM")?;

    let track_number = audio_track.track_number().get();
    let audio_settings = audio_track.audio().ok_or("No audio settings")?;
    let source_channels = audio_settings.channels().get() as u32;

    let codec_id = audio_track.codec_id();
    if codec_id != "A_OPUS" {
        return Err(format!("Unsupported codec: {codec_id}, expected A_OPUS"));
    }

    // Opus always decodes at 48000 Hz
    let source_rate: u32 = 48000;
    let target_rate: u32 = 16000;
    let target_channels: u32 = 1;

    // Read pre-skip from OpusHead
    let pre_skip: u64 = audio_track
        .codec_private()
        .and_then(|data| {
            if data.len() >= 12 && &data[0..8] == b"OpusHead" {
                Some(u16::from_le_bytes([data[10], data[11]]) as u64)
            } else {
                None
            }
        })
        .unwrap_or(0);

    // Initialize Opus decoder
    let mut opus_error: i32 = 0;
    let opus_decoder = unsafe {
        audiopus_sys::opus_decoder_create(
            source_rate as i32,
            source_channels as i32,
            &mut opus_error,
        )
    };
    if opus_error != 0 || opus_decoder.is_null() {
        return Err(format!(
            "Failed to create Opus decoder, error: {opus_error}"
        ));
    }

    // Collect all PCM samples at source rate
    let max_frame_size = (source_rate as usize / 1000) * 120 * source_channels as usize;
    let mut pcm_buffer: Vec<i16> = vec![0i16; max_frame_size];
    let mut all_samples: Vec<i16> = Vec::new();
    let mut samples_seen: u64 = 0;

    let mut frame = Frame::default();
    loop {
        match mkv.next_frame(&mut frame) {
            Ok(true) => {}
            Ok(false) => break,
            Err(e) => {
                unsafe { audiopus_sys::opus_decoder_destroy(opus_decoder) };
                return Err(format!("Failed to read frame: {e}"));
            }
        }

        if frame.track as u64 != track_number {
            continue;
        }

        let decoded_samples = unsafe {
            audiopus_sys::opus_decode(
                opus_decoder,
                frame.data.as_ptr(),
                frame.data.len() as i32,
                pcm_buffer.as_mut_ptr(),
                (max_frame_size / source_channels as usize) as i32,
                0,
            )
        };

        if decoded_samples < 0 {
            unsafe { audiopus_sys::opus_decoder_destroy(opus_decoder) };
            return Err(format!("Opus decode error: {decoded_samples}"));
        }

        let decoded_per_channel = decoded_samples as u64;

        // Handle pre-skip
        let skip = if samples_seen < pre_skip {
            std::cmp::min(pre_skip - samples_seen, decoded_per_channel)
        } else {
            0
        };
        samples_seen += decoded_per_channel;

        let usable = decoded_per_channel - skip;
        if usable == 0 {
            continue;
        }

        let start = skip as usize * source_channels as usize;
        let end = start + usable as usize * source_channels as usize;
        all_samples.extend_from_slice(&pcm_buffer[start..end]);
    }

    unsafe { audiopus_sys::opus_decoder_destroy(opus_decoder) };

    // Downmix to mono if stereo
    let mono_samples: Vec<i16> = if source_channels > 1 {
        all_samples
            .chunks(source_channels as usize)
            .map(|chunk| {
                let sum: i32 = chunk.iter().map(|&s| s as i32).sum();
                (sum / source_channels as i32) as i16
            })
            .collect()
    } else {
        all_samples
    };

    // Resample from source_rate to target_rate (simple linear interpolation)
    let resampled = resample(&mono_samples, source_rate, target_rate);

    // Write WAV
    let spec = WavSpec {
        channels: target_channels as u16,
        sample_rate: target_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    let mut writer =
        WavWriter::create(output_path, spec).map_err(|e| format!("Failed to create WAV: {e}"))?;
    for sample in &resampled {
        writer
            .write_sample(*sample)
            .map_err(|e| format!("Failed to write sample: {e}"))?;
    }
    writer
        .finalize()
        .map_err(|e| format!("Failed to finalize WAV: {e}"))?;

    Ok(())
}

/// Simple linear interpolation resampler.
fn resample(input: &[i16], from_rate: u32, to_rate: u32) -> Vec<i16> {
    if from_rate == to_rate {
        return input.to_vec();
    }

    let ratio = from_rate as f64 / to_rate as f64;
    let output_len = (input.len() as f64 / ratio) as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_pos = i as f64 * ratio;
        let idx = src_pos as usize;
        let frac = src_pos - idx as f64;

        let sample = if idx + 1 < input.len() {
            let a = input[idx] as f64;
            let b = input[idx + 1] as f64;
            (a + (b - a) * frac) as i16
        } else if idx < input.len() {
            input[idx]
        } else {
            0
        };

        output.push(sample);
    }

    output
}
