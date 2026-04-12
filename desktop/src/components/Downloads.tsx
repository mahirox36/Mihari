import { useEffect, useState, useCallback } from "react";
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
  CheckCircle2,
  XCircle,
  Clock,
  Film,
  Music,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "../api";
import { toast } from "sonner";
import { Dropdown, DropdownItem } from "./Keys";

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

function formatDate(iso?: string) {
  if (!iso) return "–";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    finished: {
      color:
        "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Done",
    },
    failed: {
      color:
        "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
      icon: <XCircle className="w-3 h-3" />,
      label: "Failed",
    },
    canceled: {
      color:
        "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
      icon: <X className="w-3 h-3" />,
      label: "Cancelled",
    },
    downloading: {
      color:
        "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
      icon: <Download className="w-3 h-3 animate-bounce" />,
      label: "Active",
    },
    queued: {
      color:
        "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
      icon: <Clock className="w-3 h-3" />,
      label: "Queued",
    },
  };

  const { color, icon, label } = map[status] ?? {
    color: "text-gray-500 bg-gray-100 border-gray-200",
    icon: null,
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}
    >
      {icon}
      {label}
    </span>
  );
}

interface ItemProps {
  item: HistoryItem;
  deleteItem: (id: number) => void;
  onSelect: (item: HistoryItem) => void;
  selected: boolean;
}

function Item({ item, deleteItem, onSelect, selected }: ItemProps) {
  const title = item.metadata?.title ?? item.filename ?? "Untitled";
  const isAudio = item.config?.extract_audio;
  const isFinished = item.status === "finished";

  const actionItems: DropdownItem[] = [
    {
      label: "Download Again",
      value: "download",
      icon: Download,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(item.url);
          window.api.send("download-request");
          toast.success("Download restarted");
        } catch {
          toast.error("Failed to restart download");
        }
      },
    },
    {
      label: "Open in Browser",
      value: "browser",
      icon: Copy,
      onClick: () => window.api.openExternal(item.url),
    },
    {
      label: "Copy Link",
      value: "copy",
      icon: Share2,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(item.url);
          toast.success("Link copied!");
        } catch {
          toast.error("Failed to copy");
        }
      },
    },
    { divider: true },
    {
      label: "Delete History & File",
      value: "delete",
      icon: Trash2,
      danger: true,
      onClick: async () => {
        const response = await window.api.deleteFile(
          `${item.config.output_path}\\${item.filename}`,
        );
        if (response.success) {
          toast.success("File deleted.");
          deleteItem(item.id);
        } else {
          toast.error("Failed to delete file.");
        }
      },
    },
  ];

  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-b border-gray-100 dark:border-gray-800/60 last:border-b-0 ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/15 border-l-2 border-l-indigo-500"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/40 border-l-2 border-l-transparent"
      }`}
      onClick={() => onSelect(item)}
    >
      {/* Thumbnail */}
      <div className="w-16 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-sm">
        {item.thumbnail_path ? (
          <img
            src={`file://${item.thumbnail_path.replace(/\\/g, "/")}`}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-gray-300 dark:text-gray-600">
            {isAudio ? (
              <Music className="w-5 h-5" />
            ) : (
              <Film className="w-5 h-5" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
            {title}
          </p>
          <StatusBadge status={item.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          {item.metadata?.uploader && (
            <span className="truncate max-w-[140px]">
              {item.metadata.uploader}
            </span>
          )}
          {item.metadata?.duration && (
            <>
              <span>·</span>
              <span>{formatDuration(item.metadata.duration)}</span>
            </>
          )}
          <span className="ml-auto flex-shrink-0">
            {formatDate(item.date_finished || item.date_created)}
          </span>
        </div>
        {item.status === "failed" && item.error && (
          <p className="text-xs text-red-500 dark:text-red-400 truncate">
            {item.error}
          </p>
        )}
      </div>

      {/* Quick Actions — always visible, not just on hover */}
      <div
        className="flex items-center gap-0.5 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isFinished && (
          <>
            <button
              title="Play"
              className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
              onClick={async (e) => {
                e.stopPropagation();
                const result = await window.api.openFile(
                  `${item.config.output_path}/${item.filename}`,
                );
                if (!result.success) toast.error(result.error);
              }}
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              title="Show in folder"
              className="p-2 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
              onClick={async (e) => {
                e.stopPropagation();
                const result = await window.api.showInFolder(
                  `${item.config.output_path}/${item.filename}`,
                );
                if (!result.success) toast.error(result.error);
              }}
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          title="Delete history"
          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(item.id);
          }}
        >
          <Trash className="w-4 h-4" />
        </button>
        <Dropdown
          trigger={
            <button
              title="More options"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              // onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={actionItems}
          width="w-52"
          offsetX={-160}
        />
      </div>
    </div>
  );
}

function DetailPanel({
  item,
  onClose,
}: {
  item: HistoryItem;
  onClose: () => void;
}) {
  const title = item.metadata?.title ?? item.filename ?? "Untitled";
  const isFinished = item.status === "finished";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 ">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thumbnail */}
      {item.thumbnail_path && (
        <div className="p-3 pb-0">
          <div className="rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 shadow-md">
            <img
              src={`file://${item.thumbnail_path.replace(/\\/g, "/")}`}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={item.status} />
          {item.metadata?.duration && (
            <span className="text-xs text-gray-400">
              {formatDuration(item.metadata.duration)}
            </span>
          )}
        </div>

        {item.metadata?.uploader && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Channel
            </p>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {item.metadata.uploader}
            </p>
          </div>
        )}

        {item.metadata?.view_count && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Views
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {Number(item.metadata.view_count).toLocaleString()}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
            Downloaded
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            {formatDate(item.date_finished)}
          </p>
        </div>

        {item.filename && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              File
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded-lg">
              {item.filename}
            </p>
          </div>
        )}

        {item.error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
              Error
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 break-all">
              {item.error}
            </p>
          </div>
        )}

        {isFinished && (
          <div className="flex flex-col gap-2 pt-1">
            <button
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/25"
              onClick={() =>
                window.api.openFile(
                  `${item.config.output_path}/${item.filename}`,
                )
              }
            >
              <Play className="w-4 h-4" />
              Play
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-all cursor-pointer"
              onClick={() =>
                window.api.showInFolder(
                  `${item.config.output_path}/${item.filename}`,
                )
              }
            >
              <FolderOpen className="w-4 h-4" />
              Show in Folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface DownloadsProp {
  isActive: boolean;
}

type FilterType = "all" | "finished" | "failed" | "other";

export function Downloads({ isActive }: DownloadsProp) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<HistoryItem[]>("/history");
      setItems(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load download history.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteItem = (id: number) => {
    api.delete(`/history/${id}`);
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  useEffect(() => {
    if (isActive) fetchItems();
  }, [isActive, fetchItems]);

  const filteredItems = items.filter((item) => {
    const title = (item.metadata?.title ?? item.filename ?? "").toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "finished" && item.status === "finished") ||
      (filter === "failed" && item.status === "failed") ||
      (filter === "other" && !["finished", "failed"].includes(item.status));
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: items.length,
    finished: items.filter((i) => i.status === "finished").length,
    failed: items.filter((i) => i.status === "failed").length,
    other: items.filter((i) => !["finished", "failed"].includes(i.status))
      .length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-gray-400 dark:text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Loading history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-500">
        <XCircle className="w-10 h-10" />
        <p className="text-sm font-medium">{error}</p>
        <button
          onClick={fetchItems}
          className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    /* Full-bleed container — takes all the space the parent gives */
    <div className="flex h-[calc(100vh-6rem)] -m-4 overflow-hidden">
      {/* ── LEFT: MAIN LIST ── */}
      <div
        className={`flex flex-col flex-1 min-w-0 ${selectedItem ? "" : "rounded-r-xl"}`}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search downloads…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchItems}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 border border-transparent  transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-2.5 flex-shrink-0 ">
          {(["all", "finished", "failed", "other"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === f
                    ? "bg-white/25 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    No results for "{searchTerm}"
                  </p>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-xs text-indigo-500 mt-2 hover:underline underline-offset-2"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <Download className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {filter === "all"
                      ? "No downloads yet"
                      : `No ${filter} downloads`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Downloads will appear here after you start one
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <Item
                key={item.id}
                item={item}
                deleteItem={deleteItem}
                onSelect={setSelectedItem}
                selected={selectedItem?.id === item.id}
              />
            ))
          )}
        </div>

        {/* Footer stats */}
        {items.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5  flex-shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {filteredItems.length} of {items.length} downloads
            </span>
            {counts.failed > 0 && (
              <span className="text-xs font-semibold text-red-500">
                {counts.failed} failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: DETAIL PANEL ── */}
      {selectedItem && (
        <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700/60">
          <DetailPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        </div>
      )}
    </div>
  );
}
