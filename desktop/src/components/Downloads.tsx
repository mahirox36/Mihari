import { useEffect, useState } from "react";
import { DownloadConfig } from "../types/asyncyt";
import {
  FolderOpen,
  Trash,
  Play,
  Search,
  Download,
  MoreHorizontal,
  Copy,
  Share2,
  Trash2,
} from "lucide-react";
import { api } from "../api";
import { toast } from "sonner";
import { Dropdown, DropdownItem } from "./Keys";

interface ItemProp {
  id: number;
  Title: string;
  thumbnail_path?: string;
  status: string;
  filepath: string;
  output: string;
  url: string;
  deleteItem: (id: number) => void;
}

function Item({
  id,
  Title,
  thumbnail_path,
  output,
  filepath,
  url,
  deleteItem,
}: ItemProp) {
  const baseButton =
    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl shadow-md transition-all font-semibold text-lg select-none dark:shadow-white/20 focus:outline-none focus:ring-2 focus:r|ing-offset-2 hover:shadow-xl";

  const actionItems: DropdownItem[] = [
    {
      label: "Download Again",
      value: "download",
      icon: Download,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(url);
          window.api.send("download-request");
          toast.success("Media started downloading");
        } catch {
          toast.error("Failed to download");
        }
      },
    },
    {
      label: "Open in Browser",
      value: "browser",
      icon: Copy,
      onClick: () => {
        window.api.openExternal(url);
      },
    },
    {
      label: "Copy Link",
      value: "copy",
      icon: Share2,

      onClick: async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied!");
        } catch {
          toast.error("Failed to copy");
        }
      },
    },
    { divider: true },
    // {
    //   label: "Properties",
    //   value: "properties",
    //   icon: Info,
    //   onClick: () => console.log("Archive clicked"),
    // },
    {
      label: "Delete History and File",
      value: "delete",
      icon: Trash2,
      danger: true,
      onClick: async () => {
        const response = await window.api.deleteFile(`${output}\\${filepath}`);
        console.log(`${output}\\${filepath}`)
        if (response.success) {
          toast.success("File Deleted successfully.");
          deleteItem(id);
        } else {
          toast.error("File Delation was unsuccessful.");
          console.log(response.error)
        }
        // 
      },
    },
  ];
  return (
    <div
      key={id}
      className="flex items-center gap-3 p-2 shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-white via-cyan-50 to-blue-100 dark:from-cyan-900 dark:via-blue-800 dark:to-indigo-700 rounded-xl transition-all hover:shadow-indigo-500/40 hover:scale-[1.03] origin-center duration-200"
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
      <p className="flex-1 font-semibold text-sm md:text-base truncate min-w-0">
        {Title}
      </p>
      <div className="flex gap-2">
        <button
          title="Open file"
          className={`${baseButton} bg-gradient-to-br from-indigo-500/0 to-blue-600/0 text-neutral-900 dark:text-neutral-100 focus:ring-indigo-400 hover:from-indigo-400/95 hover:to-blue-500/95 hover:shadow-blue-500/40 hover:scale-105`}
          onClick={async () => {
            const result = await window.api.openFile(`${output}/${filepath}`);
            console.log(result);
            if (!result.success) {
              toast.error(result.error);
            }
          }}
        >
          <Play />
        </button>

        <button
          title="Show in folder"
          className={`${baseButton} bg-gradient-to-br from-indigo-500/0 to-blue-600/0 text-neutral-900 dark:text-neutral-100 focus:ring-teal-400 hover:from-teal-400/95 hover:to-cyan-500/95 hover:shadow-teal-500/40 hover:scale-105`}
          onClick={async () => {
            const result = await window.api.showInFolder(
              `${output}/${filepath}`
            );
            console.log(result);
            if (!result.success) {
              toast.error(result.error);
            }
          }}
        >
          <FolderOpen />
        </button>

        <button
          title="Delete History"
          className={`${baseButton} bg-gradient-to-br from-orange-500/0 to-red-600/0 text-neutral-900 dark:text-neutral-100 focus:ring-red-400 hover:from-orange-400/95 hover:to-red-500/95 hover:shadow-red-500/40 hover:scale-105`}
          onClick={() => deleteItem(id)}
        >
          <Trash />
        </button>
        <Dropdown
          trigger={
            <button
              title="More"
              className={`${baseButton} bg-gradient-to-br from-orange-500/0 to-red-600/0 text-neutral-900 dark:text-neutral-100 focus:ring-zinc-400 hover:from-zinc-400/95 hover:to-neutral-500/95 hover:shadow-neutral-500/40 hover:scale-105`}
            >
              <MoreHorizontal />
            </button>
          }
          items={actionItems}
          width="w-54"
          offsetX={-160}
        />
      </div>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const deleteItem = (id: number) => {
    api.delete(`/history/${id}`);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
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
    <div className="flex flex-col gap-5 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-200 w-4 h-4" />
        <input
          type="text"
          placeholder="Search downloads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-gradient-to-r from-white to-cyan-50 border border-gray-200 dark:border-gray-700 shadow-sm text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300  transition-all text-black"
        />
      </div>

      <div className="min-h-[200px]">
        {filteredItems.length === 0 && searchTerm !== "" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-12 h-12 text-gray-600 dark:text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No matches found for "{searchTerm}"
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Download className="w-12 h-12 text-gray-600 dark:text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Your downloads will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Item
                key={item.id}
                id={item.id}
                Title={item.metadata?.title}
                thumbnail_path={item.thumbnail_path}
                status={item.status}
                filepath={item.filename}
                url={item.url}
                output={item.config.output_path}
                deleteItem={deleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
