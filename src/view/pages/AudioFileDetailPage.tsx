import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAudioFile,
  getAudioFileBytes,
  deleteAudioFile,
  convertAudioFile,
  getConvertedFileBytes,
} from "../../infrastructure/repositories/audio-file-repository";

type Props = {
  id: string;
  onNavigate: (path: string) => void;
};

export function AudioFileDetailPage({ id, onNavigate }: Props) {
  const queryClient = useQueryClient();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const mp3UrlRef = useRef<string | null>(null);

  const { data: file, isLoading, error } = useQuery({
    queryKey: ["audioFile", id],
    queryFn: async () => {
      const result = await getAudioFile(id);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
  });

  const handleLoadAudio = useCallback(async () => {
    if (audioUrl) return;
    const result = await getAudioFileBytes(id);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    const mimeType = file?.originalMimeType ?? "audio/webm";
    const blob = new Blob([new Uint8Array(result.data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    setAudioUrl(url);
  }, [id, file, audioUrl]);

  const handleConvertToMp3 = useCallback(async () => {
    setConverting(true);
    setActionError(null);
    const result = await convertAudioFile(id, "mp3");
    if (!result.ok) {
      setActionError(result.error.message);
      setConverting(false);
      return;
    }
    // Load converted MP3 bytes for playback/download
    const bytesResult = await getConvertedFileBytes(id, "mp3");
    setConverting(false);
    if (!bytesResult.ok) {
      setActionError(bytesResult.error.message);
      return;
    }
    const blob = new Blob([new Uint8Array(bytesResult.data)], {
      type: "audio/mpeg",
    });
    const url = URL.createObjectURL(blob);
    mp3UrlRef.current = url;
    setMp3Url(url);
  }, [id]);

  const handleDelete = useCallback(async () => {
    const result = await deleteAudioFile(id);
    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: ["audioFiles"] });
      onNavigate("list");
    } else {
      setActionError(result.error.message);
    }
  }, [id, onNavigate, queryClient]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (mp3UrlRef.current) {
        URL.revokeObjectURL(mp3UrlRef.current);
      }
    };
  }, []);

  const displayError = error instanceof Error ? error.message : actionError;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-5xl rounded-[2rem] bg-zinc-900/95 px-8 py-10 shadow-2xl ring-1 ring-white/5 sm:px-12 sm:py-14">
        <button
          className="mb-6 text-lg text-zinc-400 underline hover:text-zinc-200"
          onClick={() => onNavigate("list")}
          type="button"
        >
          ← 一覧に戻る
        </button>

        {isLoading && (
          <p className="text-center text-lg text-zinc-400">読み込み中...</p>
        )}
        {displayError && (
          <div className="mb-4 rounded-2xl bg-red-950/70 px-4 py-3 text-lg text-red-200">
            {displayError}
          </div>
        )}

        {file && (
          <>
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white">
              {file.name}
            </h1>

            <div className="mb-6 space-y-1 text-lg text-zinc-400">
              <p>
                形式: {file.originalMimeType} (.{file.originalExtension})
              </p>
              <p>作成: {new Date(file.createdAt).toLocaleString()}</p>
            </div>

            <div className="mb-6 flex flex-col items-center gap-4">
              {!audioUrl && (
                <button
                  className="min-w-48 rounded-full bg-blue-700 px-6 py-4 text-xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
                  onClick={handleLoadAudio}
                  type="button"
                >
                  音声を読み込む
                </button>
              )}
              {audioUrl && (
                <audio
                  controls
                  autoPlay
                  src={audioUrl}
                  className="w-full max-w-lg"
                />
              )}
            </div>

            <div className="mb-6 flex flex-col items-center gap-4">
              {!mp3Url && !converting && (
                <button
                  className="min-w-48 rounded-full bg-emerald-700 px-6 py-4 text-xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600"
                  onClick={handleConvertToMp3}
                  type="button"
                >
                  MP3 に変換
                </button>
              )}
              {converting && (
                <p className="text-lg font-bold text-zinc-200">変換中...</p>
              )}
              {mp3Url && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-lg font-semibold text-emerald-300">
                    MP3 変換完了
                  </p>
                  <audio controls src={mp3Url} className="w-full max-w-lg" />
                  <a
                    href={mp3Url}
                    download={`${file.name}.mp3`}
                    className="rounded-lg bg-emerald-700 px-5 py-2 font-medium text-white transition hover:bg-emerald-600"
                  >
                    MP3 をダウンロード
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                className="rounded-lg bg-zinc-700 px-6 py-3 font-medium text-zinc-300 transition hover:bg-red-700 hover:text-white"
                onClick={handleDelete}
                type="button"
              >
                このファイルを削除
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
