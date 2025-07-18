import { Home, Download, Settings, AlertCircle, X } from "lucide-react";
import { Button } from "./Keys";
import { useEffect, useState } from "react";

interface SidebarProps {
  activePage: string;
  setActivePage: React.Dispatch<React.SetStateAction<string>>;
}

type UpdateType = {
  updateAvailable: boolean;
  localVersion: string;
  latestVersion: string;
};

export function Sidebar({ activePage, setActivePage }: SidebarProps) {
  const [update, setUpdate] = useState<UpdateType | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(true);

  useEffect(() => {
    (async () => {
      setUpdate(await window.api.isUpdateAvailable());
    })();
  }, []);

  return (
    <div className="flex-none flex flex-col justify-between w-64 bg-gradient-to-tl from-[var(--sidebar-gradient-from)] via-[var(--sidebar-gradient-via)] to-[var(--sidebar-gradient-to)] dark:from-[var(--dark-sidebar-gradient-from)]  dark:via-[var(--dark-sidebar-gradient-via)] dark:to-[var(--dark-sidebar-gradient-to)] text-[var(--sidebar-text)] p-6 shadow-lg">
      <div>
        <img
        src="./icon2.png"
        alt="App Icon"
        className="w-44 mb-7"
        draggable={false}
      />
        <nav className="flex flex-col space-y-4">
          <Button
            name="Home"
            Icon={Home}
            property={activePage}
            setProperty={setActivePage}
          />
          <Button
            name="Downloads"
            Icon={Download}
            property={activePage}
            setProperty={setActivePage}
          />
          <Button
            name="Settings"
            Icon={Settings}
            property={activePage}
            setProperty={setActivePage}
          />
        </nav>
      </div>

      {/* Update Notification */}
      {update?.updateAvailable && showUpdateNotification && (
        <div className="relative -m-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg border-t border-white/20">
          <button
            onClick={() => {
              setShowUpdateNotification(false);
            }}
            className="absolute top-2 right-2 p-1 cursor-pointer hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <AlertCircle size={20} className="text-yellow-200" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Update Available</h3>
              <p className="text-xs text-emerald-100 mb-3">
                Version {update.latestVersion} is ready to install
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    window.api.openExternal(
                      "https://github.com/mahirox36/Mihari/releases/latest"
                    );
                    setShowUpdateNotification(false);
                  }}
                  className="px-3 py-1.5 cursor-pointer bg-white text-emerald-700 text-xs font-medium rounded-md hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  Update Now
                </button>
                <button
                  onClick={() => {
                    setShowUpdateNotification(false);
                  }}
                  className="px-3 py-1.5 cursor-pointer bg-white/20 text-white text-xs font-medium rounded-md hover:bg-white/30 transition-colors border border-white/30"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
