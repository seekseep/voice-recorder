import { useState, useCallback } from "react";
import { Sidebar } from "./view/components/Sidebar";
import { RecordAudioPage } from "./view/pages/RecordAudioPage";
import { AudioFileDetailPage } from "./view/pages/AudioFileDetailPage";

type Route =
  | { page: "record" }
  | { page: "detail"; id: string };

function App() {
  const [route, setRoute] = useState<Route>({ page: "record" });

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
