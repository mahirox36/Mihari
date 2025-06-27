import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Home } from "./components/Home";
import { Settings } from "./components/Settings";
import { api } from "./api";
import { Toaster } from "react-hot-toast";
function App() {
  const [autoPaste, setAutoPaste] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [downloadPath, setDownloadPath] = useState("");
  const [activePage, setActivePage] = useState("Home");

  type settingsFetch = {
      status: boolean;
      value: {
        auto_paste: boolean;
        auto_download: boolean;
        download_path: string;
      };
      error?: string;
    };
  
    useEffect(() => {
      async function fetchData() {
        try {
          const response = await api.get<settingsFetch>("/settings");
          setAutoPaste(response.data.value.auto_paste);
          setAutoDownload(response.data.value.auto_download);
          setDownloadPath(response.data.value.download_path || "");
        } catch (err: any) {
        }
      }
      fetchData();
    }, []);

  function renderContent() {
    switch (activePage) {
      case "Home":
        return <Home autoPaste={autoPaste} autoDownload={autoDownload} downloadPath={downloadPath} />;
      case "Downloads":
        return <div>⬇️ Here are your Downloads.</div>;
      case "Settings":
        return <Settings autoPaste={autoPaste} setAutoPaste={setAutoPaste} autoDownload={autoDownload} setAutoDownload={setAutoDownload} downloadPath={downloadPath} setDownloadPath={setDownloadPath} />
      default:
        return <div>Page not found.</div>;
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar />
      <div className="flex h-screen">
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <div className="flex-1 bg-gradient-to-tr from-cyan-100 via-blue-200 to-indigo-200 dark:from-cyan-950 dark:via-blue-950 dark:to-indigo-950 text-gray-900 dark:text-cyan-50 p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
