import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAudioFiles,
  deleteAudioFile,
  saveRecording,
} from "../../infrastructure/repositories/audio-file-repository";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLayout } from "../components/PageLayout";

type Props = {
  onNavigate: (path: string) => void;
};

export function AudioFileListPage({ onNavigate }: Props) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["audioFiles"],
    queryFn: async () => {
      const result = await listAudioFiles();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
  });

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deleteAudioFile(id);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["audioFiles"] });
      } else {
        setActionError(result.error.message);
      }
    },
    [queryClient],
  );

  const handleUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setActionError(null);

      const arrayBuffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      const extension = file.name.split(".").pop() ?? "bin";
      const name = file.name.replace(/\.[^.]+$/, "");

      const result = await saveRecording({
        name,
        bytes,
        mimeType: file.type || "audio/unknown",
        extension,
      });

      setUploading(false);

      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["audioFiles"] });
      } else {
        setActionError(result.error.message);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [queryClient],
  );

  const displayError = error instanceof Error ? error.message : actionError;

  return (
    <PageLayout>
      <h1 className="mb-4 text-center text-2xl font-bold text-foreground">
        録音一覧
      </h1>

      <div className="mb-6 flex justify-center gap-3">
        <Button
          variant="destructive"
          className="rounded-full bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500"
          onClick={() => onNavigate("record")}
        >
          新規録音
        </Button>
        <Button
          variant="outline"
          className="rounded-full px-6 py-3 font-bold"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? "アップロード中..." : "ファイルを選択"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {isLoading && (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      )}
      {displayError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      {!isLoading && files.length === 0 && !error && (
        <p className="text-center text-muted-foreground">録音がありません</p>
      )}

      <ul className="flex flex-col gap-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between rounded-lg bg-zinc-800/80 px-4 py-3 ring-1 ring-white/5"
          >
            <Button
              variant="ghost"
              className="flex h-auto flex-1 flex-col items-start gap-0.5 text-left"
              onClick={() => onNavigate(`detail/${file.id}`)}
            >
              <span className="font-medium text-foreground">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(file.createdAt).toLocaleString()}
                {file.textContent && " ・ 文字起こし済み"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-3 text-xs text-muted-foreground hover:text-red-400"
              onClick={() => handleDelete(file.id)}
            >
              削除
            </Button>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
