/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import {
  CheckSquare,
  Square,
  ListVideo,
  Download,
  Clock,
  Eye,
  User,
  Hash,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Modal from "./Modal";

export interface PlaylistVideoInfo {
  id: string;
  url: string;
  title: string | null;
  duration: number;
  uploader: string | null;
  thumbnail: string | null;
  upload_date: string;
  view_count: number;
  playlist_index: number | null;
}

export interface PlaylistInfo {
  id: string;
  url: string;
  title: string;
  description: string | null;
  uploader: string | null;
  thumbnail: string | null;
  entry_count: number;
  entries: PlaylistVideoInfo[];
}

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistInfo: PlaylistInfo | null;
  isLoading: boolean;
  onDownload: (selectedIds: string[], concurrency: number) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(count: number): string {
  if (!count) return "–";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || "–";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function VideoRow({
  video,
  selected,
  onToggle,
}: {
  video: PlaylistVideoInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onToggle}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 border ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/60"
          : "bg-white dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/40 hover:border-indigo-200 dark:hover:border-indigo-700/40"
      }`}
    >
      <div className="shrink-0 text-indigo-500 dark:text-indigo-400">
        {selected ? (
          <CheckSquare className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
        )}
      </div>

      <span className="shrink-0 w-6 text-xs font-mono text-gray-400 dark:text-gray-500 text-right">
        {video.playlist_index ?? "–"}
      </span>

      <div className="shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
        {video.thumbnail && !imgError ? (
          <img
            src={video.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ListVideo className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
          {video.title || "Untitled"}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {video.uploader && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate max-w-30">
              <User className="w-3 h-3 shrink-0" />
              {video.uploader}
            </span>
          )}
          {video.duration > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3 shrink-0" />
              {formatDuration(video.duration)}
            </span>
          )}
          {video.view_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Eye className="w-3 h-3 shrink-0" />
              {formatViews(video.view_count)}
            </span>
          )}
          {video.upload_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Hash className="w-3 h-3 shrink-0" />
              {formatDate(video.upload_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlaylistModal({
  isOpen,
  onClose,
  playlistInfo,
  isLoading,
  onDownload,
}: PlaylistModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [concurrency, setConcurrency] = useState(2);
  const [maxVideos, setMaxVideos] = useState<number | "">("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playlistInfo) {
      setSelected(new Set(playlistInfo.entries.map((e) => e.id || e.url)));
    }
  }, [playlistInfo]);

  const entries = playlistInfo?.entries ?? [];
  const allIds = entries.map((e) => e.id || e.url);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = allIds.some((id) => selected.has(id)) && !allSelected;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectMax() {
    const n =
      typeof maxVideos === "number"
        ? maxVideos
        : parseInt(String(maxVideos), 10);
    if (!n || n <= 0) return;
    setSelected(new Set(allIds.slice(0, n)));
  }

  function handleDownload() {
    const selectedVideoIds = entries
      .filter((e) => selected.has(e.id || e.url))
      .map((e) => e.id)
      .filter(Boolean) as string[];
    onDownload(selectedVideoIds, concurrency);
    onClose();
  }

  const totalDuration = entries
    .filter((e) => selected.has(e.id || e.url))
    .reduce((sum, e) => sum + (e.duration || 0), 0);

  // Placed inside Modal's flex header row — sits left of the X button
  const header = (
    <div className="flex items-center gap-3 min-w-0 py-0.5">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
        <ListVideo className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate leading-tight">
          {isLoading ? "Loading Playlist…" : playlistInfo?.title || "Playlist"}
        </h2>
        {playlistInfo && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {playlistInfo.entry_count} videos
            {playlistInfo.uploader && ` · ${playlistInfo.uploader}`}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      modalType="playlist"
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      customHeader={header}
    >
      {/*
        Direct child of Modal's "flex-1 min-h-0 flex flex-col" content area.
        Must also be flex-col + flex-1 + min-h-0 so the chain stays unbroken
        all the way down to the scrollable list.
      */}
      <div className="flex flex-col flex-1 min-h-0 pt-2">
        {/* Loading */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fetching playlist info…
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && playlistInfo && (
          <>
            {/* Toolbar — never grows or scrolls */}
            <div className="shrink-0 flex items-center gap-3 flex-wrap py-2.5 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                ) : someSelected ? (
                  <div className="w-4 h-4 rounded border-2 border-indigo-500 bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-indigo-600 dark:bg-indigo-300 rounded" />
                  </div>
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {allSelected ? "Deselect all" : "Select all"}
              </button>

              <span className="text-gray-200 dark:text-gray-600 select-none">
                |
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  First
                </span>
                <input
                  type="number"
                  min={1}
                  max={entries.length}
                  value={maxVideos}
                  onChange={(e) =>
                    setMaxVideos(
                      e.target.value === "" ? "" : parseInt(e.target.value, 10),
                    )
                  }
                  placeholder="N"
                  className="w-14 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                />
                <button
                  onClick={selectMax}
                  disabled={!maxVideos}
                  className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Select
                </button>
              </div>

              <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
                {selected.size} / {entries.length} selected
                {totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
              </span>
            </div>

            {/* Video list — THE ONLY thing that scrolls */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-2 space-y-1.5"
            >
              {entries.map((video) => (
                <VideoRow
                  key={video.id || video.url}
                  video={video}
                  selected={selected.has(video.id || video.url)}
                  onToggle={() => toggleOne(video.id || video.url)}
                />
              ))}
            </div>

            {/* Footer — pinned, never scrolls */}
            <div className="shrink-0 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Concurrent
                  </span>
                  <div className="relative">
                    <select
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  disabled={selected.size === 0}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-md hover:shadow-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                >
                  <Download className="w-4 h-4" strokeWidth={2.5} />
                  Download{" "}
                  {selected.size > 0
                    ? `${selected.size} video${selected.size > 1 ? "s" : ""}`
                    : ""}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
