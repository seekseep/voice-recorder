import { useCallback, useEffect, useRef, useState } from "react";
import { RecorderService } from "../../infrastructure/services/recorder-service";
import {
  executeStartRecording,
  executeStopAndSaveRecording,
} from "../../application/usecases/record-audio-file-usecase";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "../components/PageLayout";

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
    <PageLayout className="text-center">
      <Badge variant="secondary" className="mb-2 uppercase tracking-[0.3em]">
        Phase 1
      </Badge>
      <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
        Voice Recorder
      </h1>
      <p className="mx-auto max-w-3xl text-2xl leading-relaxed text-muted-foreground">
        録音を開始して、停止後にローカル保存フローへ渡します。
      </p>

      <div className="mt-16 flex min-h-30 flex-col items-center justify-center gap-4">
        {state === "idle" && (
          <Button
            variant="destructive"
            className="min-w-56 rounded-full bg-red-600 px-8 py-5 text-3xl font-bold text-white hover:bg-red-500"
            onClick={handleStart}
          >
            録音開始
          </Button>
        )}

        {state === "recording" && (
          <>
            <div className="text-xl font-bold text-foreground">録音中...</div>
            <Button
              className="min-w-56 rounded-full bg-blue-700 px-8 py-5 text-3xl font-bold text-white hover:bg-blue-600"
              onClick={handleStop}
            >
              停止
            </Button>
          </>
        )}

        {state === "saving" && (
          <div className="text-xl font-bold text-foreground">保存中...</div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 text-left">
          <AlertDescription className="text-lg">{error}</AlertDescription>
        </Alert>
      )}
      {lastSaved && (
        <Alert className="mt-4 border-emerald-800 bg-emerald-950/70 text-left text-emerald-200">
          <AlertDescription className="text-lg">{lastSaved}</AlertDescription>
        </Alert>
      )}

      <div className="mt-8">
        <Button
          variant="link"
          className="text-lg text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate("list")}
        >
          ← 一覧に戻る
        </Button>
      </div>
    </PageLayout>
  );
}
