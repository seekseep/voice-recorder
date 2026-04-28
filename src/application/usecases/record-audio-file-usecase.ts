import {
  RecorderService,
  type RecordingMonitorSnapshot,
  type RecordedAudio,
  type RecorderErrorCode,
} from "../../infrastructure/services/recorder-service";
import {
  saveRecording,
  type SaveRecordingResult,
  type SaveRecordingErrorCode,
} from "../../infrastructure/repositories/audio-file-repository";
import { fail, type AppResult } from "../../shared/result/app-result";

export type RecordAudioFileErrorCode =
  | RecorderErrorCode
  | SaveRecordingErrorCode
  | "recording_data_empty";

export type RecordingMonitorViewModel = {
  elapsedMs: number;
  elapsedLabel: string;
  waveform: number[];
};

export function executeStartRecording(
  recorder: RecorderService,
): Promise<AppResult<void, RecorderErrorCode>> {
  return recorder.start();
}

export function executeGetRecordingMonitorSnapshot(
  recorder: RecorderService,
): AppResult<RecordingMonitorViewModel, RecorderErrorCode> {
  const result = recorder.getMonitorSnapshot();
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: mapRecordingMonitorViewModel(result.data),
  };
}

export async function executeRecordAudioFile(
  recorded: RecordedAudio,
): Promise<AppResult<SaveRecordingResult, RecordAudioFileErrorCode>> {
  if (recorded.blob.size === 0) {
    return fail("recording_data_empty", "録音データが空です");
  }

  let arrayBuffer: ArrayBuffer;

  try {
    arrayBuffer = await recorded.blob.arrayBuffer();
  } catch {
    return fail("recording_data_empty", "録音データの読み取りに失敗しました");
  }

  const bytes = Array.from(new Uint8Array(arrayBuffer));

  const name = `recording_${new Date().toISOString().replace(/[:.]/g, "-")}`;

  return saveRecording({
    name,
    bytes,
    mimeType: recorded.mimeType,
    extension: recorded.suggestedExtension,
  });
}

export async function executeStopAndSaveRecording(
  recorder: RecorderService,
): Promise<AppResult<SaveRecordingResult, RecordAudioFileErrorCode>> {
  const stopResult = await recorder.stop();
  if (!stopResult.ok) {
    return stopResult;
  }

  return executeRecordAudioFile(stopResult.data);
}

function mapRecordingMonitorViewModel(
  snapshot: RecordingMonitorSnapshot,
): RecordingMonitorViewModel {
  return {
    elapsedMs: snapshot.elapsedMs,
    elapsedLabel: formatElapsedLabel(snapshot.elapsedMs),
    waveform: snapshot.waveform,
  };
}

function formatElapsedLabel(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}
