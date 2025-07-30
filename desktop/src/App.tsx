import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Home } from "./components/Home";
import { Settings } from "./components/Settings";
import { api } from "./api";
import { Toaster } from "react-hot-toast";
import { Downloads } from "./components/Downloads";

interface AppProp {
  theme: any;
  setTheme: React.Dispatch<any>;
}

function App({ theme, setTheme }: AppProp) {
  const [autoPaste, setAutoPaste] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [showNotification, setShowNotification] = useState(true);
  const [downloadPath, setDownloadPath] = useState("");
  const [onDownload, setOnDownload] = useState("nothing");
  const [closeToTray, setCloseToTray] = useState(true);
  const [activePage, setActivePage] = useState("Home");

  type settingsFetch = {
    status: boolean;
    value: {
      auto_paste: boolean;
      auto_download: boolean;
      show_notification: boolean;
      download_path: string;
      on_download: string;
      close_to_tray: boolean;
    };
    error?: string;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await api.get<settingsFetch>("/settings");
        setAutoPaste(response.data.value.auto_paste);
        setAutoDownload(response.data.value.auto_download);
        setShowNotification(response.data.value.show_notification);
        setDownloadPath(response.data.value.download_path || "");
        setOnDownload(response.data.value.on_download || "nothing");
        setCloseToTray(response.data.value.close_to_tray);
      } catch (err: any) {}
    }
    fetchData();
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar closeToTray={closeToTray} />
      <div className="flex h-screen">
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <div
          className="flex-1 bg-gradient-to-tr from-[var(--bg-gradient-from)] via-[var(--bg-gradient-via)] to-[var(--bg-gradient-to)] dark:from-[var(--dark-bg-gradient-from)] dark:via-[var(--dark-bg-gradient-via)] dark:to-[var(--dark-bg-gradient-to)] text-[var(--text)] dark:text-[var(--dark-text)] p-4 
        overflow-y-auto max-h-[calc(100vh-40px)] custom-scrollbar"
        >
          <>
            <div style={{ display: activePage === "Home" ? "block" : "none" }}>
              <Home
                autoPaste={autoPaste}
                autoDownload={autoDownload}
                downloadPath={downloadPath}
                onDownload={onDownload}
                showNotification={showNotification}
              />
            </div>
            <div
              style={{ display: activePage === "Downloads" ? "block" : "none" }}
            >
              <Downloads isActive={activePage === "Downloads"} />
            </div>
            <div
              style={{ display: activePage === "Settings" ? "block" : "none" }}
            >
              <Settings
                autoPaste={autoPaste}
                setAutoPaste={setAutoPaste}
                autoDownload={autoDownload}
                setAutoDownload={setAutoDownload}
                downloadPath={downloadPath}
                setDownloadPath={setDownloadPath}
                theme={theme}
                setTheme={setTheme}
                onDownload={onDownload}
                setOnDownload={setOnDownload}
                showNotification={showNotification}
                setShowNotification={setShowNotification}
                closeToTray={closeToTray}
                setCloseToTray={setCloseToTray}
              />
            </div>
          </>
        </div>
      </div>
    </div>
  );
}

export default App;
