import { useEffect, useState } from "react";
import { DownloadConfig } from "../types/asyncyt";
import { api } from "../api";

interface ItemProp {
  id: number;
  Title: string;
  thumbnail_path?: string;
  status: string;
  filepath: string;
  output: string;
}

function Item({ id, Title, thumbnail_path, output, filepath }: ItemProp) {
  return (
    <div
      key={id}
      className="flex items-center gap-3 p-2 shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-white via-cyan-50 to-blue-100 dark:from-cyan-900 dark:via-blue-800 dark:to-indigo-700 rounded-xl transition-all hover:shadow-indigo-500/40 hover:scale-105 duration-200"
    >
      <div className="w-16 h-16 flex-shrink-0 bg-gray-200 overflow-hidden rounded-2xl">
        {thumbnail_path ? (
          <img
            src={`file://${thumbnail_path.replace(/\\/g, "/")}`}
            alt={Title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="flex-1">
        <p className="font-semibold">{Title}</p>
        <p className="font-semibold">{filepath}</p>
      </div>
      <button className="flex items-center justify-center gap-2 p-3  rounded-lg shadow-lg transition-all bg-gradient-to-br from-indigo-500/90 to-blue-600/90 border-indigo-300/50 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400/95 hover:to-blue-500/95 hover:scale-105 text-white font-semibold text-lg cursor-pointer select-none"
      onClick={() => window.api.openFile(`${output}/${filepath}`)}
      >
        OpenFile
      </button>
      <button className="flex items-center justify-center gap-2 p-3  rounded-lg shadow-lg transition-all bg-gradient-to-br from-indigo-500/90 to-blue-600/90 border-indigo-300/50 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400/95 hover:to-blue-500/95 hover:scale-105 text-white font-semibold text-lg cursor-pointer select-none"
      onClick={() => window.api.showInFolder(`${output}/${filepath}`)}
      >
        showInFolder
      </button>
    </div>
  );
}

type HistoryItem = {
  id: number;
  user_id: number;
  url: string;
  filename: string;
  date_created?: string;
  date_started?: string;
  date_finished?: string;
  status: string;
  priority: string;
  error?: string;
  config: DownloadConfig;
  thumbnail_path?: string;
  metadata?: Record<string, any>;
};

interface DownloadsProp {
  isActive: boolean;
}

export function Downloads({ isActive }: DownloadsProp) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await api.get<HistoryItem[]>("/history");
        setItems(response.data);
      } catch (err) {
        setError("Oops! Failed to load items.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (isActive) {
      fetchItems();
    }
  }, [isActive]);

  const filteredItems = items.filter((item) =>
    item.metadata?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p>Loading items...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="flex flex-col gap-4 p-3">
      <input
        type="text"
        placeholder="Search by title..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 p-3 rounded-lg bg-white/80 border border-gray-200 shadow-lg text-md placeholder-gray-500 select-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 dark:text-slate-900"
      />
      <ul>
        {filteredItems.length === 0 ? (
          <p>No items found for "{searchTerm}"</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <Item
                id={item.id}
                Title={item.metadata?.title}
                thumbnail_path={item.thumbnail_path}
                status={item.status}
                filepath={item.filename}
                output={item.config.output_path}
              />
            ))}
          </ul>
        )}
      </ul>
    </div>
  );
}
