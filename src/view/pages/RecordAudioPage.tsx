import { useCallback, useEffect, useRef, useState } from "react";
import { RecorderService } from "../../infrastructure/services/recorder-service";
import {
  executeGetRecordingMonitorSnapshot,
  executeStartRecording,
  executeStopAndSaveRecording,
} from "../../application/usecases/record-audio-file-usecase";
import { Alert, AlertDescription } from "@/components/ui/alert";

type RecordingState = "idle" | "recording" | "saving";

const DEFAULT_WAVEFORM = Array.from({ length: 32 }, () => 0.04);

export function RecordAudioPage() {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [waveform, setWaveform] = useState<number[]>(DEFAULT_WAVEFORM);
  const recorderRef = useRef<RecorderService | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      recorderRef.current?.dispose();
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state !== "recording") {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const renderNextFrame = () => {
      const recorder = recorderRef.current;
      if (!recorder) return;

      const result = executeGetRecordingMonitorSnapshot(recorder);
      if (result.ok) {
        setElapsedLabel(result.data.elapsedLabel);
        setWaveform(result.data.waveform);
      }

      animationFrameRef.current = requestAnimationFrame(renderNextFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderNextFrame);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [state]);

  const handleStart = useCallback(async () => {
    setError(null);
    setLastSaved(null);
    setElapsedLabel("00:00");
    setWaveform(DEFAULT_WAVEFORM);

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
    if (!recorder) return;

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
    <div className="flex h-full flex-col items-center justify-center p-6">
      {/* Timer */}
      <div className="mb-4 font-mono text-3xl font-light tabular-nums tracking-wider text-foreground">
        {elapsedLabel}
      </div>

      {/* Waveform */}
      <div className="mb-6 flex h-32 w-full max-w-lg items-end justify-center gap-0.5 px-2">
        {waveform.map((bar, index) => (
          <div
            key={`wave-${index}`}
            className={`min-h-1 flex-1 rounded-full transition-[height] duration-75 ${
              state === "saving" ? "bg-muted-foreground/40" : "bg-primary/70"
            }`}
            style={{ height: `${Math.max(6, Math.round(bar * 120))}px` }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === "idle" && (
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full bg-destructive transition-transform hover:scale-105 active:scale-95"
            onClick={handleStart}
          >
            <div className="size-5 rounded-full bg-white" />
          </button>
        )}

        {state === "recording" && (
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full border-2 border-destructive transition-transform hover:scale-105 active:scale-95"
            onClick={handleStop}
          >
            <div className="size-5 rounded-sm bg-destructive" />
          </button>
        )}

        {state === "saving" && (
          <div className="text-sm text-muted-foreground">保存中...</div>
        )}
      </div>

      {/* Status messages */}
      {state === "recording" && (
        <p className="mt-3 text-xs text-muted-foreground">録音中</p>
      )}

      <div className="mt-4 w-full max-w-md">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {lastSaved && (
          <Alert>
            <AlertDescription>{lastSaved}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
