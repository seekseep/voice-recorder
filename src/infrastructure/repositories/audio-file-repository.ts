import { invoke } from "@tauri-apps/api/core";
import { fail, succeed, type AppResult } from "../../shared/result/app-result";

export type SaveRecordingParams = {
  name: string;
  bytes: number[];
  mimeType: string;
  extension: string;
};

export type SaveRecordingResult = {
  id: string;
  storedPath: string;
  originalMimeType: string;
  originalExtension: string;
};

export type SaveRecordingErrorCode = "save_command_failed";

export async function saveRecording(
  params: SaveRecordingParams
): Promise<AppResult<SaveRecordingResult, SaveRecordingErrorCode>> {
  try {
    const data = await invoke<SaveRecordingResult>("save_recording", params);
    return succeed(data);
  } catch (e) {
    const message = typeof e === "string" ? e : "保存に失敗しました";
    return fail("save_command_failed", message);
  }
}
