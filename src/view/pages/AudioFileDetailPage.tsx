import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAudioFile,
  getAudioFileBytes,
  deleteAudioFile,
  transcribeAudioFile,
} from "../../infrastructure/repositories/audio-file-repository";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLayout } from "../components/PageLayout";

type Props = {
  id: string;
  onNavigate: (path: string) => void;
};

export function AudioFileDetailPage({ id, onNavigate }: Props) {
  const queryClient = useQueryClient();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  const {
    data: file,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["audioFile", id],
    queryFn: async () => {
      const result = await getAudioFile(id);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
  });

  // Auto-load audio
  useEffect(() => {
    if (!file || audioUrl) return;
    (async () => {
      const result = await getAudioFileBytes(id);
      if (!result.ok) return;
      const mimeType = file.originalMimeType ?? "audio/webm";
      const blob = new Blob([new Uint8Array(result.data)], { type: mimeType });
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
    })();
  }, [id, file, audioUrl]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const handleTranscribe = useCallback(async () => {
    setTranscribing(true);
    setActionError(null);
    const result = await transcribeAudioFile(id, "ja");
    setTranscribing(false);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["audioFile", id] });
  }, [id, queryClient]);

  const handleDelete = useCallback(async () => {
    const result = await deleteAudioFile(id);
    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: ["audioFiles"] });
      onNavigate("list");
    } else {
      setActionError(result.error.message);
    }
  }, [id, onNavigate, queryClient]);

  const displayError = error instanceof Error ? error.message : actionError;

  return (
    <PageLayout>
      <Button
        variant="link"
        className="mb-4 px-0 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => onNavigate("list")}
      >
        ← 戻る
      </Button>

      {isLoading && (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      )}
      {displayError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      {file && (
        <>
          <h1 className="mb-1 text-xl font-bold text-foreground">{file.name}</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            {new Date(file.createdAt).toLocaleString()}
          </p>

          {audioUrl && (
            <audio controls src={audioUrl} className="mb-6 w-full" />
          )}

          {file.textContent ? (
            <div className="mb-6 rounded-xl bg-zinc-800/80 px-4 py-3 ring-1 ring-white/5">
              <p className="mb-1 text-xs font-semibold text-violet-400">
                文字起こし
              </p>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">
                {file.textContent}
              </p>
            </div>
          ) : (
            <div className="mb-6 flex justify-center">
              {transcribing ? (
                <p className="text-muted-foreground">文字起こし中...</p>
              ) : (
                <Button
                  className="rounded-full bg-violet-700 px-6 py-3 font-bold text-white hover:bg-violet-600"
                  onClick={handleTranscribe}
                >
                  文字起こし
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground hover:text-red-400"
              onClick={handleDelete}
            >
              削除
            </Button>
          </div>
        </>
      )}
    </PageLayout>
  );
}
