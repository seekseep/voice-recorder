import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAudioFile,
  getAudioFileBytes,
  deleteAudioFile,
  type AudioFileDetail,
} from "../../infrastructure/repositories/audio-file-repository";

type Props = {
  id: string;
  onNavigate: (path: string) => void;
};

export function AudioFileDetailPage({ id, onNavigate }: Props) {
  const [file, setFile] = useState<AudioFileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getAudioFile(id);
      if (result.ok) {
        setFile(result.data);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const handleLoadAudio = useCallback(async () => {
    if (audioUrl) return;
    const result = await getAudioFileBytes(id);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    const mimeType = file?.originalMimeType ?? "audio/webm";
    const blob = new Blob([new Uint8Array(result.data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    setAudioUrl(url);
  }, [id, file, audioUrl]);

  const handleDelete = useCallback(async () => {
    const result = await deleteAudioFile(id);
    if (result.ok) {
      onNavigate("list");
    } else {
      setError(result.error.message);
    }
  }, [id, onNavigate]);

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

        {loading && (
          <p className="text-center text-lg text-zinc-400">読み込み中...</p>
        )}
        {error && (
          <div className="mb-4 rounded-2xl bg-red-950/70 px-4 py-3 text-lg text-red-200">
            {error}
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
