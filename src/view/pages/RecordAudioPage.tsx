import { useCallback, useEffect, useRef, useState } from "react";
import { RecorderService } from "../../infrastructure/services/recorder-service";
import {
  executeStartRecording,
  executeStopAndSaveRecording,
} from "../../application/usecases/record-audio-file-usecase";

type RecordingState = "idle" | "recording" | "saving";

export function RecordAudioPage() {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const recorderRef = useRef<RecorderService | null>(null);

  useEffect(() => {
    return () => {
      recorderRef.current?.dispose();
      recorderRef.current = null;
    };
  }, []);

  const handleStart = useCallback(async () => {
    setError(null);
    setLastSaved(null);

    const recorder = new RecorderService();
    const result = await executeStartRecording(recorder);

    if (!result.ok) {
      recorder.dispose();
      setError(result.error.message);
      setState("idle");
      return;
    }

    recorderRef.current = recorder;
    setState("recording");
  }, []);

  const handleStop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return;
    }

    setState("saving");
    setError(null);

    const stopResult = await executeStopAndSaveRecording(recorder);
    recorder.dispose();
    recorderRef.current = null;

    if (!stopResult.ok) {
      setError(stopResult.error.message);
      setState("idle");
      return;
    }

    setLastSaved(
      `保存完了: ${stopResult.data.id} (${stopResult.data.originalMimeType}, .${stopResult.data.originalExtension})`,
    );
    setState("idle");
  }, []);

  return (
    <main className="container">
      <section className="panel">
        <p className="eyebrow">Phase 1</p>
        <h1>Voice Recorder</h1>
        <p className="description">
          録音を開始して、停止後にローカル保存フローへ渡します。
        </p>

        <div className="recording-controls">
          {state === "idle" && (
            <button className="btn btn-record" onClick={handleStart} type="button">
              録音開始
            </button>
          )}

          {state === "recording" && (
            <>
              <div className="recording-indicator">録音中...</div>
              <button className="btn btn-stop" onClick={handleStop} type="button">
                停止
              </button>
            </>
          )}

          {state === "saving" && <div className="saving-indicator">保存中...</div>}
        </div>

        {error && <div className="message error-message">{error}</div>}
        {lastSaved && <div className="message success-message">{lastSaved}</div>}
      </section>
    </main>
  );
}
