import { X, Minus, Maximize } from "lucide-react";

interface ToolbarProp {
  closeToTray: boolean
}

export function Toolbar({ closeToTray }: ToolbarProp) {
  const BaseButton =
    "size-10 flex items-center justify-center transition-all duration-150 ease-in-ou focus:outline-none";
  return (
    <div className="relative flex items-center justify-between bg-gray-900 text-white pl-4 h-10 select-none toolbar z-50">
      <img
        src="./icon.svg"
        alt="App Icon"
        className="h-5 w-5"
        draggable={false}
      />
      <span className="absolute left-1/2 transform -translate-x-1/2 font-semibold text-sm">
        Mihari
      </span>
      <div className="flex space-x-2">
        <button
          className={`${BaseButton} hover:bg-gray-700`}
          onClick={() => window.api.minimize()}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Minus />
        </button>
        <button
          className={`${BaseButton} hover:bg-gray-700`}
          onClick={() => window.api.maximize()}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Maximize />
        </button>
        <button
          className={`${BaseButton} hover:bg-red-600`}
          onClick={() => window.api.close(closeToTray)}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <X />
        </button>
      </div>
    </div>
  );
}
