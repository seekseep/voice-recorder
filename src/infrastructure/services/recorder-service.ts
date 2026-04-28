import { fail, succeed, type AppResult } from "../../shared/result/app-result";

export type RecordedAudio = {
  blob: Blob;
  mimeType: string;
  suggestedExtension: string;
};

export type RecorderErrorCode =
  | "microphone_permission_denied"
  | "microphone_unavailable"
  | "recording_start_failed"
  | "recording_stop_failed"
  | "recording_data_empty";

type RecorderState = "idle" | "recording";

const MIME_CANDIDATES: { mimeType: string; extension: string }[] = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "m4a" },
];

function selectMimeType(): { mimeType: string; extension: string } | null {
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return null;
}

export class RecorderService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private resolvedMimeType: string = "";
  private resolvedExtension: string = "";
  private _state: RecorderState = "idle";

  get state(): RecorderState {
    return this._state;
  }

  async start(): Promise<AppResult<void, RecorderErrorCode>> {
    if (this._state === "recording") {
      return fail("recording_start_failed", "Already recording");
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch (e) {
      const domErr = e instanceof DOMException ? e : null;
      if (domErr?.name === "NotAllowedError") {
        return fail(
          "microphone_permission_denied",
          "マイクの使用が許可されていません"
        );
      }
      return fail(
        "microphone_unavailable",
        domErr?.message ?? "マイクを取得できませんでした"
      );
    }

    const selected = selectMimeType();

    const recorderOptions: MediaRecorderOptions = {};
    if (selected) {
      recorderOptions.mimeType = selected.mimeType;
      this.resolvedMimeType = selected.mimeType;
      this.resolvedExtension = selected.extension;
    } else {
      this.resolvedMimeType = "";
      this.resolvedExtension = "bin";
    }

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this._state = "recording";
    return succeed(undefined);
  }

  stop(): Promise<AppResult<RecordedAudio, RecorderErrorCode>> {
    return new Promise((resolve) => {
      if (this._state !== "recording" || !this.mediaRecorder) {
        resolve(fail("recording_stop_failed", "録音中ではありません"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType =
          this.resolvedMimeType || this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });

        this.releaseStream();
        this._state = "idle";

        if (blob.size === 0) {
          resolve(fail("recording_data_empty", "録音データが空です"));
          return;
        }

        resolve(
          succeed({
            blob,
            mimeType,
            suggestedExtension: this.resolvedExtension || "webm",
          })
        );
      };

      this.mediaRecorder.onerror = () => {
        this.releaseStream();
        this._state = "idle";
        resolve(fail("recording_stop_failed", "録音の停止中にエラーが発生しました"));
      };

      this.mediaRecorder.stop();
    });
  }

  dispose(): void {
    if (this.mediaRecorder && this._state === "recording") {
      this.mediaRecorder.stop();
    }
    this.releaseStream();
    this._state = "idle";
    this.chunks = [];
  }

  private releaseStream(): void {
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }
}
