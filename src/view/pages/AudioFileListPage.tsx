import { useState, useEffect, useCallback } from "react";
import {
  listAudioFiles,
  deleteAudioFile,
  type AudioFileSummary,
} from "../../infrastructure/repositories/audio-file-repository";

type Props = {
  onNavigate: (path: string) => void;
};

export function AudioFileListPage({ onNavigate }: Props) {
  const [files, setFiles] = useState<AudioFileSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listAudioFiles();
    if (result.ok) {
      setFiles(result.data);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deleteAudioFile(id);
      if (result.ok) {
        await loadFiles();
      } else {
        setError(result.error.message);
      }
    },
    [loadFiles],
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-5xl rounded-[2rem] bg-zinc-900/95 px-8 py-10 shadow-2xl ring-1 ring-white/5 sm:px-12 sm:py-14">
        <h1 className="mb-6 text-center text-4xl font-extrabold tracking-tight text-white">
          録音一覧
        </h1>

        <div className="mb-8 flex justify-center">
          <button
            className="min-w-48 rounded-full bg-red-600 px-6 py-4 text-xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-500"
            onClick={() => onNavigate("record")}
            type="button"
          >
            新規録音
          </button>
        </div>

        {loading && (
          <p className="text-center text-lg text-zinc-400">読み込み中...</p>
        )}
        {error && (
          <div className="mb-4 rounded-2xl bg-red-950/70 px-4 py-3 text-lg text-red-200">
            {error}
          </div>
        )}

        {!loading && files.length === 0 && !error && (
          <p className="text-center text-lg text-zinc-400">
            録音ファイルがありません
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-xl bg-zinc-800/80 px-5 py-4 ring-1 ring-white/5"
            >
              <button
                className="flex flex-1 flex-col gap-1 text-left"
                onClick={() => onNavigate(`detail/${file.id}`)}
                type="button"
              >
                <span className="text-lg font-semibold text-white">
                  {file.name}
                </span>
                <span className="text-sm text-zinc-400">
                  .{file.originalExtension} ・{" "}
                  {new Date(file.createdAt).toLocaleString()}
                </span>
              </button>
              <button
                className="ml-4 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-red-700 hover:text-white"
                onClick={() => handleDelete(file.id)}
                type="button"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
