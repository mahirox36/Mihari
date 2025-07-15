import { useEffect, useState } from "react";
import {
  Clipboard,
  Download,
  Folder,
  Info,
  Play,
  FolderOpen,
  X,
} from "lucide-react";
import { api } from "../api";
import { Dropdown } from "./Keys";

interface SettingsProp {
  autoPaste: boolean;
  setAutoPaste: React.Dispatch<React.SetStateAction<boolean>>;
  autoDownload: boolean;
  setAutoDownload: React.Dispatch<React.SetStateAction<boolean>>;
  showNotification: boolean;
  setShowNotification: React.Dispatch<React.SetStateAction<boolean>>;
  downloadPath: string;
  setDownloadPath: React.Dispatch<React.SetStateAction<string>>;
  theme: any;
  setTheme: React.Dispatch<any>;
  onDownload: string;
  setOnDownload: React.Dispatch<React.SetStateAction<string>>;
}

export function Settings({
  autoPaste,
  setAutoPaste,
  autoDownload,
  setAutoDownload,
  downloadPath,
  setDownloadPath,
  theme,
  setTheme,
  onDownload,
  setOnDownload,
  showNotification,
  setShowNotification,
}: SettingsProp) {
  const [error, setError] = useState(null);
  const [version, setVersion] = useState("vNull");

  useEffect(() => {
    const fetchVersion = async () => {
      if (Math.random() < 0.01) {
        setVersion("vNull");
        return;
      }
      const ver = await window.api.getVersion();
      setVersion(ver);
    };

    // call it
    fetchVersion();
  }, []);

  type saveSettings = {
    key: string;
    value: any;
  };

  async function saveAndSet(
    name: string,
    property: boolean,
    setProperty: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    setProperty(!property);
    await save(name, !property);
  }
  async function save(name: string, property: any) {
    const SaveSettings: saveSettings = {
      key: name.toLowerCase().replace(" ", "_"),
      value: property,
    };
    await api.post("/setting", SaveSettings);
  }

  async function selectOutputPath() {
    try {
      // @ts-ignore - window.api is available in electron context
      const result = await window.api?.selectOutputPath();
      if (result && result.success && !result.cancelled && result.path) {
        setDownloadPath(result.path);

        const SaveSettings: saveSettings = {
          key: "download_path",
          value: result.path,
        };
        await api.post("/setting", SaveSettings);
      }
    } catch (err: any) {
      setError(err.message || "Failed to select path");
    }
  }

  function SettingItem({
    icon: Icon,
    title,
    description,
    children,
  }: {
    icon: React.ForwardRefExoticComponent<any>;
    title: string;
    description: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex items-center justify-between py-4 border-b border-gray-700 dark:border-gray-100 last:border-b-0">
        <div className="flex items-start gap-3 flex-1">
          <Icon size={20} className="text-gray-600 dark:text-gray-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {title}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </div>
          </div>
        </div>
        <div className="ml-4">{children}</div>
      </div>
    );
  }

  function Toggle({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: () => void;
  }) {
    return (
      <button
        onClick={onChange}
        className={`
      relative w-12 h-6 flex-shrink-0 rounded-full transition-all duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300
      ${
        enabled
          ? "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/30"
          : "bg-gray-300 dark:bg-gray-600"
      }
      hover:scale-105 active:scale-95
    `}
      >
        <div
          className={`
        absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md
        transition-all duration-300 ease-in-out
        ${enabled ? "left-6" : "left-0.5"}
      `}
        />
      </button>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg">
        <X size={16} />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your experience
        </p>
      </div>

      {/* Settings List */}
      <div
        className="space-y-0 border border-gray-700 dark:border-gray-200 rounded-xl p-6 py-0
      overflow-y-auto max-h-[calc(59vh)] custom-scrollbar"
      >
        <SettingItem
          icon={Info}
          title="Theme"
          description="Choose your preferred appearance"
        >
          <Dropdown
            placeholder="System"
            value={theme}
            items={[
              { label: "System", value: "system" },
              { label: "Light Mode", value: "light" },
              { label: "Dark Mode", value: "dark" },
            ]}
            onSelect={(value) => setTheme(value)}
          />
        </SettingItem>

        <SettingItem
          icon={Clipboard}
          title="Auto Paste"
          description="Auto paste copied links into the URL box when the app starts"
        >
          <Toggle
            enabled={autoPaste}
            onChange={() => saveAndSet("Auto Paste", autoPaste, setAutoPaste)}
          />
        </SettingItem>

        <SettingItem
          icon={Download}
          title="Auto Download"
          description="Automatically start downloads when pasted via button"
        >
          <Toggle
            enabled={autoDownload}
            onChange={() =>
              saveAndSet("Auto Download", autoDownload, setAutoDownload)
            }
          />
        </SettingItem>

        <SettingItem
          icon={Download}
          title="Show Notification"
          description="Shows a Notification after Downloading if the app is not focused"
        >
          <Toggle
            enabled={showNotification}
            onChange={() =>
              saveAndSet(
                "Show Notification",
                showNotification,
                setShowNotification
              )
            }
          />
        </SettingItem>

        <SettingItem
          icon={Download}
          title="On Download"
          description="What to do after download completes"
        >
          <Dropdown
            placeholder="Nothing"
            value={onDownload}
            items={[
              {
                label: "Nothing",
                value: "nothing",
                onClick() {
                  save("on_download", "nothing");
                },
              },
              {
                label: "Play it",
                value: "play",
                icon: Play,
                onClick() {
                  save("on_download", "play");
                },
              },
              {
                label: "Show in Folder",
                value: "open_folder",
                icon: FolderOpen,
                onClick() {
                  save("on_download", "open_folder");
                },
              },
            ]}
            onSelect={(value) => setOnDownload(value)}
          />
        </SettingItem>

        <SettingItem
          icon={Folder}
          title="Download Path"
          description="Choose where downloads are saved"
        >
          <div className="flex items-center gap-2">
            <div className="px-3 py-2 text-sm border border-gray-600 dark:border-gray-300 rounded-lg min-w-48 max-w-64 truncate text-gray-700 dark:text-gray-300">
              {downloadPath || "No path selected"}
            </div>
            <button
              onClick={selectOutputPath}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Browse
            </button>
          </div>
        </SettingItem>
      </div>

      {/* About Section */}
      <div className="text-center space-y-4 border-gray-600 dark:border-gray-300">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            About
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ">
            <p className="flex items-center justify-center gap-1.5">
              Made with ❤️ by
              <p
                onClick={() => {
                  window.api.openExternal("https://github.com/mahirox36");
                }}
                className="cursor-pointer text-indigo-600 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300 hover:scale-105 transition duration-300"
              >
                MahiroX36
              </p>
            </p>
            <p
              onClick={() => {
                if (version === "vNull") {
                  // window.api.openPotatoWindow();
                }
              }}
              className={
                version === "vNull"
                  ? "cursor-pointer glitch hover:text-indigo-600 hover:scale-105 transition duration-300 dark:text-violet-400 dark:hover:text-violet-300"
                  : "cursor-pointer text-indigo-600 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300 hover:scale-105 transition duration-300"
              }
            >
              Version {version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
