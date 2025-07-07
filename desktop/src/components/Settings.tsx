import { useState } from "react";
import { Clipboard, Download, Folder, LucideProps } from "lucide-react";
import { api } from "../api";

interface SettingsProp {
  autoPaste: boolean;
  setAutoPaste: React.Dispatch<React.SetStateAction<boolean>>;
  autoDownload: boolean;
  setAutoDownload: React.Dispatch<React.SetStateAction<boolean>>;
  downloadPath: string;
  setDownloadPath: React.Dispatch<React.SetStateAction<string>>;
}

export function Settings({autoPaste, setAutoPaste, autoDownload, setAutoDownload, downloadPath, setDownloadPath}: SettingsProp) {
  const [error, setError] = useState(null);

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
    const SaveSettings: saveSettings = {
      key: name.toLowerCase().replace(" ", "_"),
      value: !property,
    };
    await api.post("/setting", SaveSettings);
  }


  async function selectOutputPath() {
    try {
      // @ts-ignore - window.api is available in electron context
      const result = await window.api.selectOutputPath();
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

  interface SwitchProps {
    name: string;
    description: string;
    property: boolean;
    setProperty: React.Dispatch<React.SetStateAction<boolean>>;
    Icon: React.ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
    >;
  }

  function Switch({
    name,
    description,
    property,
    setProperty,
    Icon,
  }: SwitchProps) {
    return (
      <div className="flex flex-col gap-3">
        <span className="flex gap-2 items-center text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
          <Icon size={16} />
          {name}
        </span>
        <span className="flex ml-6 items-center text-xs text-gray-600 dark:text-gray-400 select-none">
          {description}
        </span>
        <button
          onClick={() => saveAndSet(name, property, setProperty)}
          className={`
            relative w-12 h-6 ml-6 rounded-full transition-all duration-300 ease-in-out cursor-pointer
            ${
              property
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
              ${property ? "left-6" : "left-0.5"}
            `}
          />
        </button>
      </div>
    );
  }

  function PathSelector() {
    return (
      <div className="flex flex-col gap-3">
        <span className="flex gap-2 items-center text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
          <Folder size={16} />
          Download Path
        </span>
        <span className="flex ml-6 items-center text-xs text-gray-600 dark:text-gray-400 select-none">
          Choose where downloads are saved
        </span>
        <div className="flex ml-6 gap-2 items-center">
          <div className="flex-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 truncate">
            {downloadPath || "No path selected"}
          </div>
          <button
            onClick={selectOutputPath}
            className="px-3 py-2 text-xs bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-md hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Browse
          </button>
        </div>
      </div>
    );
  }

  if (error) return <div className="text-red-500 p-4">ERROR: {error}</div>;

  return (
    <div className="flex flex-col space-y-6 p-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 select-none">
          Settings
        </h1>
      </div>
      
      <div className="space-y-8">
        <Switch
          name="Auto Paste"
          description="Auto paste the link you have copied into the URL box when the app starts"
          property={autoPaste}
          setProperty={setAutoPaste}
          Icon={Clipboard}
        />
        
        <Switch
          name="Auto Download"
          description="When pasted via the button it auto downloads"
          property={autoDownload}
          setProperty={setAutoDownload}
          Icon={Download}
        />
        
        <PathSelector />
      </div>
      <a href=""><div className="bg-amber-300 p-10 h-44"></div></a>
      
    </div>
  );
}