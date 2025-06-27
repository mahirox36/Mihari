import { X, Minus, Maximize } from "lucide-react";

export function Toolbar() {
  return (
    <div className="relative flex items-center justify-between bg-gray-900 text-white pl-4 h-10 select-none toolbar">
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
          className="size-10 flex items-center justify-center hover:bg-gray-700 transition-all duration-150 ease-in-out"
          onClick={() => window.api.minimize()}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Minus />
        </button>
        <button
          className="size-10 flex items-center justify-center hover:bg-gray-700 transition-all duration-150 ease-in-out"
          onClick={() => window.api.maximize()}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Maximize />
        </button>
        <button
          className="size-10 flex items-center justify-center hover:bg-red-600 transition-all duration-150 ease-in-out"
          onClick={() => window.api.close()}
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <X />
        </button>
      </div>
    </div>
  );
}
