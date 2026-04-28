import { useState, useCallback } from "react";
import { RecordAudioPage } from "./view/pages/RecordAudioPage";
import { AudioFileListPage } from "./view/pages/AudioFileListPage";
import { AudioFileDetailPage } from "./view/pages/AudioFileDetailPage";

type Route =
  | { page: "list" }
  | { page: "record" }
  | { page: "detail"; id: string };

function parseRoute(path: string): Route {
  if (path === "record") return { page: "record" };
  if (path.startsWith("detail/")) {
    return { page: "detail", id: path.slice("detail/".length) };
  }
  return { page: "list" };
}

function App() {
  const [route, setRoute] = useState<Route>({ page: "list" });

  const handleNavigate = useCallback((path: string) => {
    setRoute(parseRoute(path));
  }, []);

  switch (route.page) {
    case "record":
      return <RecordAudioPage onNavigate={handleNavigate} />;
    case "detail":
      return (
        <AudioFileDetailPage id={route.id} onNavigate={handleNavigate} />
      );
    case "list":
    default:
      return <AudioFileListPage onNavigate={handleNavigate} />;
  }
}

export default App;
