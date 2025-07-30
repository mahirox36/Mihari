import { useEffect, useState } from "react";
import {
  Clipboard,
  Download,
  Folder,
  Info,
  Play,
  FolderOpen,
  X,
  Laptop2,
  Bell,
  MinimizeIcon,
} from "lucide-react";
import { api } from "../api";
import { Dropdown } from "./Keys";

interface TooltipButtonProps {
  icon: any;
  label: string;
  category: string;
  activeCategory: string;
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
}
const Button: React.FC<TooltipButtonProps> = ({
  icon: IconComponent,
  label,
  category,
  activeCategory,
  setActiveCategory,
}) => {
  return (
    <button
      onClick={() => setActiveCategory(category)}
      className={`group relative flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
        activeCategory === category
          ? "bg-blue-500 text-white"
          : "hover:bg-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      <IconComponent className="w-5 h-5" />
      <span
        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 p-2 bg-gray-800 text-white text-sm rounded z-10 whitespace-nowrap 
  invisible opacity-0 pointer-events-none 
  group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto 
  transition-opacity duration-200"
      >
        {label}
      </span>
    </button>
  );
};

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
  closeToTray: boolean;
  setCloseToTray: React.Dispatch<React.SetStateAction<boolean>>;
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
  closeToTray,
  setCloseToTray,
}: SettingsProp) {
  const [error, setError] = useState(null);
  const [version, setVersion] = useState("vNull");
  const [activeCategory, setActiveCategory] = useState("appearance");

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
      key: name.toLowerCase().replace(/\s+/g, "_"),
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
    <div className="max-w-3xl mx-auto p-6 space-y-8">
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
      <div className="space-y-0 border border-gray-700 dark:border-gray-200 rounded-xl py-2 pl-1 pr-6 flex flex-row">
        <div className="w-12 pt-2 pl-1 space-y-2 mr-6 border-r border-gray-700 dark:border-gray-200">
          <Button
            icon={Laptop2}
            label="Appearance & Behavior"
            category="appearance"
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
          <Button
            icon={Download}
            label="Downloads"
            category="downloads"
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
          {/* <Button
            icon={Bell}
            label="Notifications"
            category="notifications"
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          /> */}
          {/* <Button
            icon={MinimizeIcon}
            label="App Behavior"
            category="behavior"
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          /> */}
        </div>
        <div className="flex-1">
          {activeCategory === "appearance" && (
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
          )}

          {activeCategory === "appearance" && (
            <>
              <SettingItem
                icon={Clipboard}
                title="Auto Paste"
                description="Auto paste copied links into the URL box when the app starts"
              >
                <Toggle
                  enabled={autoPaste}
                  onChange={() =>
                    saveAndSet("Auto Paste", autoPaste, setAutoPaste)
                  }
                />
              </SettingItem>

              <SettingItem
                icon={MinimizeIcon}
                title="Minimize to Tray"
                description="Minimize the app to the system tray instead of closing it when you press the close button. This lets it keep running in the background."
              >
                <Toggle
                  enabled={closeToTray}
                  onChange={() =>
                    saveAndSet("Close to Tray", closeToTray, setCloseToTray)
                  }
                />
              </SettingItem>
              <SettingItem
                icon={Bell}
                title="Show Notification"
                description="Shows a Notification after Downloading if the app is not focused"
              >
                <>
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
                </>
              </SettingItem>
            </>
          )}

          {activeCategory === "downloads" && (
            <>
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
                icon={Play}
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
            </>
          )}
        </div>
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
