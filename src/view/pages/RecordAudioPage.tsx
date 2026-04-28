import { useCallback, useEffect, useRef, useState } from "react";
import { RecorderService } from "../../infrastructure/services/recorder-service";
import {
  executeStartRecording,
  executeStopAndSaveRecording,
} from "../../application/usecases/record-audio-file-usecase";

type RecordingState = "idle" | "recording" | "saving";

type Props = {
  onNavigate: (path: string) => void;
};

export function RecordAudioPage({ onNavigate }: Props) {
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
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-5xl rounded-[2rem] bg-zinc-900/95 px-8 py-10 text-center shadow-2xl ring-1 ring-white/5 sm:px-12 sm:py-14">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-blue-500">
          Phase 1
        </p>
        <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Voice Recorder
        </h1>
        <p className="mx-auto max-w-3xl text-2xl leading-relaxed text-zinc-300">
          録音を開始して、停止後にローカル保存フローへ渡します。
        </p>

        <div className="mt-16 flex min-h-[120px] flex-col items-center justify-center gap-4">
          {state === "idle" && (
            <button
              className="min-w-56 rounded-full bg-red-600 px-8 py-5 text-3xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-500"
              onClick={handleStart}
              type="button"
            >
              録音開始
            </button>
          )}

          {state === "recording" && (
            <>
              <div className="text-xl font-bold text-zinc-200">録音中...</div>
              <button
                className="min-w-56 rounded-full bg-blue-700 px-8 py-5 text-3xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
                onClick={handleStop}
                type="button"
              >
                停止
              </button>
            </>
          )}

          {state === "saving" && (
            <div className="text-xl font-bold text-zinc-200">保存中...</div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-950/70 px-4 py-3 text-left text-lg text-red-200">
            {error}
          </div>
        )}
        {lastSaved && (
          <div className="mt-4 rounded-2xl bg-emerald-950/70 px-4 py-3 text-left text-lg text-emerald-200">
            {lastSaved}
          </div>
        )}

        <div className="mt-8">
          <button
            className="text-lg text-zinc-400 underline hover:text-zinc-200"
            onClick={() => onNavigate("list")}
            type="button"
          >
            ← 一覧に戻る
          </button>
        </div>
      </section>
    </main>
  );
}
