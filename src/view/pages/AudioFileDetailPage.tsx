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
      onNavigate("record");
    } else {
      setActionError(result.error.message);
    }
  }, [id, onNavigate, queryClient]);

  const displayError = error instanceof Error ? error.message : actionError;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{file?.name}</h1>
          {file && (
            <p className="text-[11px] text-muted-foreground">
              {new Date(file.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {file && !file.textContent && !transcribing && (
            <Button size="sm" onClick={handleTranscribe}>
              文字起こし
            </Button>
          )}
          {transcribing && (
            <span className="text-xs text-muted-foreground">文字起こし中...</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            削除
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {audioUrl && (
          <div className="mb-4">
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        {file?.textContent && (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              文字起こし
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {file.textContent}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
