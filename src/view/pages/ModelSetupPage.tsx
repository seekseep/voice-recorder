import { useState, useCallback } from "react";
import { downloadWhisperModel } from "../../infrastructure/repositories/whisper-model-repository";

type Props = {
  modelName: string;
  onComplete: () => void;
};

export function ModelSetupPage({ modelName, onComplete }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    const result = await downloadWhisperModel();
    setDownloading(false);
    if (result.ok) {
      onComplete();
    } else {
      setError(result.error.message);
    }
  }, [onComplete]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900/95 px-8 py-10 text-center shadow-2xl ring-1 ring-white/5">
        <h1 className="mb-2 text-2xl font-bold text-white">初回セットアップ</h1>
        <p className="mb-6 text-zinc-400">
          文字起こしに必要な音声認識モデル（{modelName}）をダウンロードします。
          約 1.5 GB のダウンロードが発生します。
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-950/70 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {downloading ? (
          <p className="text-lg font-bold text-zinc-200">
            ダウンロード中... しばらくお待ちください
          </p>
        ) : (
          <button
            className="rounded-full bg-violet-700 px-8 py-4 text-lg font-bold text-white transition hover:bg-violet-600"
            onClick={handleDownload}
            type="button"
          >
            モデルをダウンロード
          </button>
        )}

        <p className="mt-6 text-xs text-zinc-500">
          スキップして後からダウンロードすることもできます。
        </p>
        <button
          className="mt-2 text-sm text-zinc-500 underline hover:text-zinc-300"
          onClick={onComplete}
          type="button"
          disabled={downloading}
        >
          スキップ
        </button>
      </div>
    </main>
  );
}
