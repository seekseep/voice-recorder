import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAudioFiles,
  deleteAudioFile,
  saveRecording,
} from "../../infrastructure/repositories/audio-file-repository";
import { Button } from "@/components/ui/button";

type Props = {
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onNavigate: (path: string) => void;
};

export function Sidebar({ selectedFileId, onSelectFile, onNavigate }: Props) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["audioFiles"],
    queryFn: async () => {
      const result = await listAudioFiles();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
  });

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const result = await deleteAudioFile(id);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["audioFiles"] });
        if (selectedFileId === id) {
          onNavigate("record");
        }
      }
    },
    [queryClient, selectedFileId, onNavigate],
  );

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
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
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [queryClient],
  );

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onNavigate("record")}
        >
          録音
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "..." : "読込"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="px-3 py-4 text-xs text-muted-foreground">読み込み中...</p>
        )}

        {!isLoading && files.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            録音がありません
          </p>
        )}

        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className={`group flex w-full items-center gap-2 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-sidebar-accent ${
                  selectedFileId === file.id
                    ? "bg-primary/15 text-primary"
                    : ""
                }`}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">
                    {file.name}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {new Date(file.createdAt).toLocaleDateString()}
                    {file.textContent && " ・ 文字起こし済"}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => handleDelete(e, file.id)}
                >
                  削除
                </button>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
