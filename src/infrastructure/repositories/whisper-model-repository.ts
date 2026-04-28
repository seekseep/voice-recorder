import { invoke } from "@tauri-apps/api/core";
import { fail, succeed, type AppResult } from "../../shared/result/app-result";

export type ModelStatus = {
  exists: boolean;
  modelName: string;
  modelPath: string;
};

export type ModelErrorCode = "model_check_failed" | "model_download_failed";

export async function checkWhisperModel(): Promise<
  AppResult<ModelStatus, ModelErrorCode>
> {
  try {
    const data = await invoke<ModelStatus>("check_whisper_model");
    return succeed(data);
  } catch (e) {
    const message =
      typeof e === "string" ? e : "モデルの確認に失敗しました";
    return fail("model_check_failed", message);
  }
}

export async function downloadWhisperModel(): Promise<
  AppResult<string, ModelErrorCode>
> {
  try {
    const data = await invoke<string>("download_whisper_model");
    return succeed(data);
  } catch (e) {
    const message =
      typeof e === "string" ? e : "モデルのダウンロードに失敗しました";
    return fail("model_download_failed", message);
  }
}
