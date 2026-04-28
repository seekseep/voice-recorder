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

export type AudioFileSummary = {
  id: string;
  name: string;
  originalExtension: string;
  originalMimeType: string;
  createdAt: string;
};

export type AudioFileDetail = {
  id: string;
  name: string;
  originalExtension: string;
  originalMimeType: string;
  storedPath: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveRecordingErrorCode = "save_command_failed";
export type ListErrorCode = "list_command_failed";
export type GetErrorCode = "get_command_failed";
export type DeleteErrorCode = "delete_command_failed";
export type GetBytesErrorCode = "get_bytes_command_failed";
export type ConvertErrorCode = "convert_command_failed";

export type ConvertResult = {
  convertedPath: string;
  targetExtension: string;
};

export async function saveRecording(
  params: SaveRecordingParams,
): Promise<AppResult<SaveRecordingResult, SaveRecordingErrorCode>> {
  try {
    const data = await invoke<SaveRecordingResult>("save_recording", params);
    return succeed(data);
  } catch (e) {
    const message = typeof e === "string" ? e : "保存に失敗しました";
    return fail("save_command_failed", message);
  }
}

export async function listAudioFiles(): Promise<
  AppResult<AudioFileSummary[], ListErrorCode>
> {
  try {
    const data = await invoke<AudioFileSummary[]>("list_audio_files");
    return succeed(data);
  } catch (e) {
    const message = typeof e === "string" ? e : "一覧の取得に失敗しました";
    return fail("list_command_failed", message);
  }
}

export async function getAudioFile(
  id: string,
): Promise<AppResult<AudioFileDetail, GetErrorCode>> {
  try {
    const data = await invoke<AudioFileDetail>("get_audio_file", { id });
    return succeed(data);
  } catch (e) {
    const message = typeof e === "string" ? e : "ファイル情報の取得に失敗しました";
    return fail("get_command_failed", message);
  }
}

export async function deleteAudioFile(
  id: string,
): Promise<AppResult<void, DeleteErrorCode>> {
  try {
    await invoke("delete_audio_file", { id });
    return succeed(undefined);
  } catch (e) {
    const message = typeof e === "string" ? e : "削除に失敗しました";
    return fail("delete_command_failed", message);
  }
}

export async function getAudioFileBytes(
  id: string,
): Promise<AppResult<number[], GetBytesErrorCode>> {
  try {
    const data = await invoke<number[]>("get_audio_file_bytes", { id });
    return succeed(data);
  } catch (e) {
    const message =
      typeof e === "string" ? e : "音声データの取得に失敗しました";
    return fail("get_bytes_command_failed", message);
  }
}

export async function convertAudioFile(
  id: string,
  targetFormat: string,
): Promise<AppResult<ConvertResult, ConvertErrorCode>> {
  try {
    const data = await invoke<ConvertResult>("convert_audio_file", {
      id,
      targetFormat,
    });
    return succeed(data);
  } catch (e) {
    const message = typeof e === "string" ? e : "変換に失敗しました";
    return fail("convert_command_failed", message);
  }
}

export async function getConvertedFileBytes(
  id: string,
  extension: string,
): Promise<AppResult<number[], GetBytesErrorCode>> {
  try {
    const data = await invoke<number[]>("get_converted_file_bytes", {
      id,
      extension,
    });
    return succeed(data);
  } catch (e) {
    const message =
      typeof e === "string" ? e : "変換ファイルの取得に失敗しました";
    return fail("get_bytes_command_failed", message);
  }
}
