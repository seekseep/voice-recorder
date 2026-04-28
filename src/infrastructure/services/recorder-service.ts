import { fail, succeed, type AppResult } from "../../shared/result/app-result";

export type RecordedAudio = {
  blob: Blob;
  mimeType: string;
  suggestedExtension: string;
};

export type RecordingMonitorSnapshot = {
  elapsedMs: number;
  waveform: number[];
};

export type RecorderErrorCode =
  | "microphone_permission_denied"
  | "microphone_unavailable"
  | "recording_start_failed"
  | "recording_stop_failed"
  | "recording_data_empty"
  | "recording_monitor_unavailable";

type RecorderState = "idle" | "recording";
const DEFAULT_WAVEFORM_BAR_COUNT = 32;

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
  private audioContext: AudioContext | null = null;
  private mediaSourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private waveformBuffer: Uint8Array | null = null;
  private chunks: Blob[] = [];
  private resolvedMimeType: string = "";
  private resolvedExtension: string = "";
  private recordingStartedAtMs: number | null = null;
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
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);
    } catch {
      this.releaseStream();
      return fail("recording_start_failed", "録音の初期化に失敗しました");
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.initializeMonitor();
    this.mediaRecorder.start();
    this.recordingStartedAtMs = performance.now();
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

        this.releaseResources();
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
        this.releaseResources();
        this._state = "idle";
        resolve(fail("recording_stop_failed", "録音の停止中にエラーが発生しました"));
      };

      this.mediaRecorder.stop();
    });
  }

  getMonitorSnapshot(): AppResult<RecordingMonitorSnapshot, RecorderErrorCode> {
    if (this._state !== "recording" || this.recordingStartedAtMs === null) {
      return fail("recording_monitor_unavailable", "録音モニタを取得できません");
    }

    const elapsedMs = Math.max(0, Math.floor(performance.now() - this.recordingStartedAtMs));

    if (!this.analyserNode || !this.waveformBuffer) {
      return succeed({
        elapsedMs,
        waveform: createFallbackWaveform(DEFAULT_WAVEFORM_BAR_COUNT),
      });
    }

    this.analyserNode.getByteTimeDomainData(this.waveformBuffer);

    return succeed({
      elapsedMs,
      waveform: buildWaveformBars(this.waveformBuffer, DEFAULT_WAVEFORM_BAR_COUNT),
    });
  }

  dispose(): void {
    if (this.mediaRecorder && this._state === "recording") {
      this.mediaRecorder.stop();
    }
    this.releaseResources();
    this._state = "idle";
    this.chunks = [];
  }

  private initializeMonitor(): void {
    if (!this.mediaStream) {
      return;
    }

    try {
      this.audioContext = new AudioContext();
      this.mediaSourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.waveformBuffer = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.mediaSourceNode.connect(this.analyserNode);
    } catch {
      this.closeMonitor();
    }
  }

  private releaseResources(): void {
    this.closeMonitor();
    this.releaseStream();
    this.recordingStartedAtMs = null;
  }

  private closeMonitor(): void {
    this.mediaSourceNode?.disconnect();
    this.analyserNode?.disconnect();
    void this.audioContext?.close();
    this.mediaSourceNode = null;
    this.analyserNode = null;
    this.waveformBuffer = null;
    this.audioContext = null;
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

function createFallbackWaveform(count: number): number[] {
  return Array.from({ length: count }, () => 0.04);
}

function buildWaveformBars(buffer: Uint8Array, barCount: number): number[] {
  const samplesPerBar = Math.max(1, Math.floor(buffer.length / barCount));
  const waveform: number[] = [];

  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const start = barIndex * samplesPerBar;
    const end = Math.min(buffer.length, start + samplesPerBar);

    let totalAmplitude = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      totalAmplitude += Math.abs((buffer[sampleIndex] - 128) / 128);
    }

    const averageAmplitude =
      end > start ? totalAmplitude / (end - start) : 0;

    waveform.push(Math.max(0.04, Math.min(1, averageAmplitude * 2.4)));
  }

  return waveform;
}
