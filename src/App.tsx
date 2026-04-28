import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./view/components/Sidebar";
import { RecordAudioPage } from "./view/pages/RecordAudioPage";
import { AudioFileDetailPage } from "./view/pages/AudioFileDetailPage";
import { ModelSetupPage } from "./view/pages/ModelSetupPage";
import { checkWhisperModel } from "./infrastructure/repositories/whisper-model-repository";

type Route =
  | { page: "record" }
  | { page: "detail"; id: string };

type AppState = "loading" | "setup" | "ready";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [modelName, setModelName] = useState("ggml-medium.bin");
  const [route, setRoute] = useState<Route>({ page: "record" });

  useEffect(() => {
    (async () => {
      const result = await checkWhisperModel();
      if (result.ok && result.data.exists) {
        setAppState("ready");
      } else {
        if (result.ok) setModelName(result.data.modelName);
        setAppState("setup");
      }
    })();
  }, []);

  const handleSetupComplete = useCallback(() => {
    setAppState("ready");
  }, []);

  const handleNavigate = useCallback((path: string) => {
    if (path === "record") {
      setRoute({ page: "record" });
    } else if (path.startsWith("detail/")) {
      setRoute({ page: "detail", id: path.slice("detail/".length) });
    }
  }, []);

  const handleSelectFile = useCallback((id: string) => {
    setRoute({ page: "detail", id });
  }, []);

  if (appState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">読み込み中...</p>
      </main>
    );
  }

  if (appState === "setup") {
    return (
      <ModelSetupPage
        modelName={modelName}
        onComplete={handleSetupComplete}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        selectedFileId={route.page === "detail" ? route.id : null}
        onSelectFile={handleSelectFile}
        onNavigate={handleNavigate}
      />
      <main className="flex-1 overflow-y-auto">
        {route.page === "record" && <RecordAudioPage />}
        {route.page === "detail" && (
          <AudioFileDetailPage id={route.id} onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}

export default App;
