/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Clipboard,
  Settings2,
  Download,
  X,
  Upload,
  Save,
  FolderOpen,
  AlertCircle,
  Trash2,
  Settings,
  Archive,
  Music,
  Video,
  Zap,
  ListVideo,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Dropdown, Switch } from "./Keys";
import {
  DownloadRequest,
  DownloadConfig,
  DownloadProgress,
  DownloadResponse,
  VideoInfo,
  LoadedPreset,
  SavedPreset,
  VideoEncodingConfig,
  AudioEncodingConfig,
  EncodingConfig,
  PlaylistDownloadProgress,
} from "../types/asyncyt";
import { toast } from "sonner";
import { AdvanceSidebar } from "./AdvanceSidebar";
import { Preset } from "../types/enums";
import { useHotkeys } from "../hooks/shortcutManager";
import Modal from "./Modal";
import { PlaylistModal, PlaylistInfo } from "./PlaylistModal";
import { api } from "../api";

interface HomeProp {
  autoPaste: boolean;
  autoDownload: boolean;
  showNotification: boolean;
  downloadPath: string;
  onDownload: string;
}

const AUTO_CODEC = "auto";

const VIDEO_QUALITIES = [
  { label: "Best Quality", value: "best" },
  { label: "4K (2160p)", value: "2160p" },
  { label: "1440p", value: "1440p" },
  { label: "1080p", value: "1080p" },
  { label: "720p", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
  { label: "240p", value: "240p" },
  { label: "144p", value: "144p" },
  { label: "Worst", value: "worst" },
];

const VIDEO_FORMATS = [
  { label: "Auto", value: "auto" },
  { label: "MP4", value: "mp4" },
  { label: "MKV", value: "mkv" },
  { label: "WEBM", value: "webm" },
  { label: "MOV", value: "mov" },
  { label: "AVI", value: "avi" },
  { label: "FLV", value: "flv" },
];

const AUDIO_FORMATS = [
  { label: "Auto", value: "auto" },
  { label: "MP3", value: "mp3" },
  { label: "M4A", value: "m4a" },
  { label: "AAC", value: "aac" },
  { label: "FLAC", value: "flac" },
  { label: "WAV", value: "wav" },
  { label: "OPUS", value: "opus" },
  { label: "OGG", value: "ogg" },
  { label: "ALAC", value: "alac" },
  { label: "AIFF", value: "aiff" },
];
const ThumbnailSupportedFormats = [
  "auto",
  "mp3",
  "mp4",
  "m4a",
  "mkv",
  "mov",
  "flac",
  "ogg",
  "opus",
];

function formatETA(seconds: number) {
  if (!seconds || seconds <= 0) return "–";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Child progress item (individual video inside a playlist or single download) ───
interface DownloadItemProps {
  itemProgress: DownloadProgress;
  cancel: (itemID: string) => void;
  compact?: boolean;
}
function DownloadItem({
  itemProgress,
  cancel,
  compact = false,
}: DownloadItemProps) {
  const pct = Math.round(itemProgress.percentage ?? 0);
  const isEncoding =
    itemProgress.status === "encoding" ||
    (itemProgress.encoding_percentage ?? 0) > 0;
  const encodingPct = Math.round(itemProgress.encoding_percentage ?? 0);
  const isWaiting = itemProgress.status === "waiting";

  const statusLabel = () => {
    if (itemProgress.status === "encoding") return "Encoding";
    if (itemProgress.status === "merging") return "Merging";
    if (itemProgress.status === "remuxing") return "Remuxing";
    if (itemProgress.status === "downloading") return "Downloading";
    if (itemProgress.status === "waiting") return "Queued";
    return itemProgress.status ?? "Working";
  };

  const canCancel = () =>
    itemProgress.status === "encoding" || itemProgress.status === "downloading";

  const displayPct = isEncoding ? encodingPct : pct;

  const barColor = isEncoding
    ? "from-violet-500 to-fuchsia-500"
    : isWaiting
      ? "from-gray-400 to-gray-500"
      : "from-cyan-500 to-blue-600";

  const dotColor = isWaiting
    ? "bg-gray-400"
    : isEncoding
      ? "bg-violet-400"
      : "bg-cyan-400";

  const statusColor = isEncoding
    ? "text-violet-400"
    : isWaiting
      ? "text-gray-400"
      : "text-cyan-400";

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/40">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${!isWaiting ? "animate-pulse" : ""}`}
        />
        <p className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
          {itemProgress.title || "Preparing…"}
        </p>
        <span className={`text-xs shrink-0 ${statusColor}`}>
          {statusLabel()}
        </span>
        <span className="text-xs font-mono text-gray-400 shrink-0 w-7 text-right">
          {displayPct}%
        </span>
        <div className="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
          <div
            className={`h-full rounded-full bg-linear-to-r ${barColor} transition-all duration-500`}
            style={{ width: `${displayPct}%` }}
          />
        </div>
        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            cancel(itemProgress.id);
          }}
          disabled={!canCancel()}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-0 transition-all"
        >
          <X className="w-3 h-3" />
        </button> */}
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-4 px-4 py-3 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 hover:border-indigo-300 dark:hover:border-indigo-600/60 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full ${dotColor} ${!isWaiting ? "animate-pulse" : ""}`}
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {itemProgress.title || "Preparing…"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium ${statusColor}`}>
              {statusLabel()}
            </span>
            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right">
              {displayPct}%
            </span>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full bg-linear-to-r ${barColor} transition-all duration-500`}
            style={{ width: `${displayPct}%` }}
          />
        </div>

        {!isWaiting && (
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            {!isEncoding && itemProgress.speed && (
              <span className="font-mono">{itemProgress.speed}</span>
            )}
            {isEncoding && itemProgress.encoding_fps && (
              <span className="font-mono">{itemProgress.encoding_fps} fps</span>
            )}
            {!isEncoding && itemProgress.eta > 0 && (
              <span>ETA {formatETA(itemProgress.eta)}</span>
            )}
            {!isEncoding && itemProgress.total_bytes > 0 && (
              <span className="ml-auto">
                {formatBytes(itemProgress.downloaded_bytes)} /{" "}
                {formatBytes(itemProgress.total_bytes)}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => cancel(itemProgress.id)}
        disabled={!canCancel()}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border-none bg-transparent transition-all duration-150 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none enabled:cursor-pointer ${canCancel() ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Playlist progress group ───
interface PlaylistProgressItem {
  playlistId: string;
  title: string;
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  overallPercentage?: number;
  status: string;
  children: Map<string, DownloadProgress>;
}

interface PlaylistProgressCardProps {
  item: PlaylistProgressItem;
  cancel: (id: string) => void;
  cancelPlaylist: (playlistId: string) => void;
}
function PlaylistProgressCard({
  item,
  cancel,
  cancelPlaylist,
}: PlaylistProgressCardProps) {
  const [expanded, setExpanded] = useState(true);
  const childrenArray = Array.from(item.children.values());
  const isComplete = item.status === "completed";

  // ─── REAL-TIME PARENT PERCENTAGE CALCULATION ───
  // This derives the exact mathematical average on every render
  // ensuring the parent bar flawlessly matches the children
  const calculateRealTimeProgress = () => {
    if (item.totalVideos === 0) return 0;

    let totalSum = 0;
    childrenArray.forEach((child) => {
      const isEncoding =
        child.status === "encoding" || (child.encoding_percentage ?? 0) > 0;

      const childPct = isEncoding
        ? (child.encoding_percentage ?? 0)
        : (child.percentage ?? 0);

      totalSum += childPct;
    });

    return totalSum / item.totalVideos;
  };

  const pct = isComplete ? 100 : Math.round(calculateRealTimeProgress());

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 shadow-sm overflow-hidden">
      {/* Parent row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="shrink-0">
          <div
            className={`w-2.5 h-2.5 rounded-full ${isComplete ? "bg-emerald-400" : "bg-indigo-400 animate-pulse"}`}
          />
        </div>

        <ListVideo className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {item.title}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.completedVideos}/{item.totalVideos}
              </span>
              <span className="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 w-8 text-right">
                {pct}%
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            cancelPlaylist(item.playlistId);
          }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
          title="Cancel playlist"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="shrink-0 text-gray-400">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && childrenArray.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700/40 px-3 py-2 space-y-1 bg-gray-50/50 dark:bg-gray-900/20">
          {childrenArray.map((child) => (
            <DownloadItem
              key={child.id}
              itemProgress={child}
              cancel={cancel}
              compact
            />
          ))}
        </div>
      )}
      {expanded && !(childrenArray.length > 0) && (
        <div className="border-t border-gray-100 dark:border-gray-700/40 px-3 py-2 space-y-1 bg-gray-50/50 dark:bg-gray-900/20 animate-pulse text-sm text-gray-400 flex items-center gap-2">
          Fetching playlist videos info...
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───
function isPlaylistUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.searchParams.has("list") ||
      u.pathname.includes("/playlist") ||
      u.searchParams.has("playlist_id")
    );
  } catch {
    return false;
  }
}

export function Home({
  autoPaste,
  autoDownload,
  downloadPath,
  onDownload,
  showNotification,
}: HomeProp) {
  const [url, setUrl] = useState("");
  const [onlyAudio, setOnlySound] = useState(false);
  const [quality, setQuality] = useState("best");
  const [format, setFormat] = useState("auto");
  const [formatAudio, setFormatAudio] = useState("auto");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const [userPrefEmbedThumbnail, setUserPrefEmbedThumbnail] = useState(true);
  const [userPrefEmbedSubtitles, setUserPrefEmbedSubtitles] = useState(true);

  const activeFormat = onlyAudio ? formatAudio : format;
  const isThumbnailSupported = ThumbnailSupportedFormats.includes(activeFormat);
  const isSubtitleSupported = !onlyAudio;

  const embedThumbnail = isThumbnailSupported && userPrefEmbedThumbnail;
  const embedSubs = isSubtitleSupported && userPrefEmbedSubtitles;

  // Single-video progress list
  const [progress, setProgress] = useState<Array<DownloadProgress>>([]);
  // Playlist progress map: playlistId → PlaylistProgressItem
  const [playlistProgress, setPlaylistProgress] = useState<
    Map<string, PlaylistProgressItem>
  >(new Map());

  const [isOpen, setIsOpen] = useState(false);

  const [videoEncoding, setVideoEncoding] = useState<VideoEncodingConfig>({
    codec: AUTO_CODEC,
    bitrate: null,
    crf: null,
    preset: Preset.MEDIUM,
    maxrate: null,
    bufsize: null,
    tune: null,
    pixel_format: null,
    width: null,
    height: null,
    fps: null,
    extra_args: [],
  });

  const [audioEncoding, setAudioEncoding] = useState<AudioEncodingConfig>({
    codec: AUTO_CODEC,
    bitrate: null,
    quality: null,
    sample_rate: null,
    channels: null,
    extra_args: [],
  });

  const [encodingOverwrite, setEncodingOverwrite] = useState(false);
  const [encodingExtraGlobalArgs, setEncodingExtraGlobalArgs] = useState<
    string[]
  >([]);
  const [writeSubs, setWriteSubs] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState("en");
  const [writeThumbnail, setWriteThumbnail] = useState(false);
  const [writeInfoJson, setWriteInfoJson] = useState(false);
  const [customFilename, setCustomFilename] = useState("");
  const [cookiesFile, setCookiesFile] = useState("");
  const [proxy, setProxy] = useState("");
  const [rateLimit, setRateLimit] = useState("");
  const [retries, setRetries] = useState(3);
  const [fragmentRetries, setFragmentRetries] = useState(3);
  const [concurrentFragments, setConcurrentFragments] = useState(3);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [writeLiveChat, setWriteLiveChat] = useState(false);
  const [customOptions, setCustomOptions] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modal, setModal] = useState("save");
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [presets, setPresets] = useState<Array<LoadedPreset>>([]);

  // Playlist state
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [pendingPlaylistUrl, setPendingPlaylistUrl] = useState("");

  function normalizeCodec<T extends string>(value?: T | "auto" | null) {
    return value === AUTO_CODEC ? null : (value ?? null);
  }

  function normalizeNullableString(value: string) {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  useHotkeys([
    { key: "v", ctrl: true, action: () => paste() },
    { key: "d", ctrl: true, action: () => download() },
    { key: "q", ctrl: true, action: () => setOnlySound(!onlyAudio) },
    { key: "a", ctrl: true, action: () => setIsOpen(!isOpen) },
    {
      key: "s",
      ctrl: true,
      action: () => {
        if (modal === "load" && isModalOpen) setModal("save");
        else {
          setIsModalOpen(!isModalOpen);
          setModal("save");
        }
      },
    },
    {
      key: "x",
      ctrl: true,
      action: () => {
        if (modal === "save" && isModalOpen) setModal("load");
        else {
          setIsModalOpen(!isModalOpen);
          setModal("load");
        }
      },
    },
    {
      key: "escape",
      action: () => {
        setIsModalOpen(false);
        setPlaylistModalOpen(false);
      },
    },
  ]);

  // ── Single-video progress helpers ──
  function pushItem(newItem: DownloadProgress) {
    setProgress((prev) => [...prev, newItem]);
  }
  function popItem(id: string) {
    setProgress((prev) => prev.filter((item) => item.id !== id));
  }
  function editItemById(id: string, newItem: Partial<DownloadProgress>) {
    setProgress((prev) =>
      prev.map((item) => (item.id !== id ? item : { ...item, ...newItem })),
    );
  }

  // ── Playlist progress helpers ──
  function upsertPlaylistChild(
    playlistId: string,
    childProgress: DownloadProgress,
  ) {
    setPlaylistProgress((prev) => {
      const next = new Map(prev);
      const pl = next.get(playlistId);
      if (!pl) return next;
      const children = new Map(pl.children);
      children.set(childProgress.id, childProgress);
      next.set(playlistId, { ...pl, children });
      return next;
    });
  }

  function updatePlaylistMeta(
    playlistId: string,
    updates: Partial<Omit<PlaylistProgressItem, "children">>,
  ) {
    setPlaylistProgress((prev) => {
      const next = new Map(prev);
      const pl = next.get(playlistId);
      if (!pl) return next;
      next.set(playlistId, { ...pl, ...updates });
      return next;
    });
  }

  function removePlaylist(playlistId: string) {
    setPlaylistProgress((prev) => {
      const next = new Map(prev);
      next.delete(playlistId);
      return next;
    });
  }

  async function cancel(itemID: string) {
    socket?.send(JSON.stringify({ type: "cancel", id: itemID }));
    popItem(itemID);
  }

  async function cancelPlaylist(playlistId: string) {
    socket?.send(JSON.stringify({ type: "cancel_playlist", id: playlistId }));
    removePlaylist(playlistId);
  }

  function validateUrl(url: string) {
    if (!url || typeof url !== "string")
      return { isValid: false, error: "input is not string" };
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol))
        return { isValid: false, error: "it's not a URL" };
      return { isValid: true, url: url.trim() };
    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  }

  function AutoPaste() {
    try {
      if (autoPaste) paste();
    } catch (err: any) {
      console.error("autoPaste error:", err);
    }
  }

  useEffect(() => {
    AutoPaste();
    (async () => {
      const res = await api.get("/presets");
      setPresets(res.data);
    })();
    window.api.send("renderer-ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.api.onOpenFile((filePath: string) => {
      importPreset(filePath);
    });
  }, []);

  async function importPreset(filePath?: string) {
    if (!filePath) {
      const response = await window.api.selectMihariPresetFile();
      if (response.cancelled) return;
      if (!response.success || !response.paths) {
        toast.error(
          `Failed to select preset file: ${response.error || "Unknown error"}`,
        );
        return;
      }
      for (const path of response.paths) {
        const result = await window.api.handleFile(path);
        if (result.status === "success") toast.success(result.message);
        else
          toast.error(
            `Failed to import file: ${result.error || "Unknown error"}`,
          );
      }
    } else {
      const result = await window.api.handleFile(filePath);
      if (result.status === "success") toast.success(result.message);
      else
        toast.error(
          `Failed to import file: ${result.error || "Unknown error"}`,
        );
    }
    const res = await api.get("/presets");
    setPresets(res.data);
  }

  async function exportPreset(name: string, uuid: string) {
    const file = await window.api.saveMihariPresetFile(name);
    if (file.cancelled) return;
    if (!file || !file.path) {
      toast.error("Failed to select export path for preset");
      return;
    }
    const response = await api.post("/presets/export", {
      uuid,
      path: file.path,
    });
    if (response.data.status === "failed")
      toast.error(`Failed to export preset: ${name}`);
    else toast.success(`Preset ${name} exported successfully!`);
  }

  async function exportAllPresets() {
    const file = await window.api.saveMihariPresetFile("all_presets");
    if (file.cancelled) return;
    if (!file || !file.path) {
      toast.error("Failed to select export path for all presets");
      return;
    }
    const response = await api.post("/presets/export/all", { path: file.path });
    if (response.data.status === "failed")
      toast.error(`Failed to export all presets: ${response.data.error}`);
    else toast.success(`All presets exported successfully!`);
  }

  async function deletePreset(uuid: string) {
    const response = await api.delete(`/presets/${uuid}`);
    if (response.data.status === "failed") {
      toast.error(`Failed to delete preset: ${response.data.error}`);
      return;
    }
    setPresets((prev) => prev.filter((p) => p.uuid !== uuid));
    toast.success("Preset deleted successfully!");
  }

  async function paste(forceDownloaded: boolean = false) {
    const result = await window.api.getPaste();
    if (!result || !result.text) {
      toast.error(`${result} is not a Link`);
      return;
    }
    const validateResult = validateUrl(result.text);
    if (validateResult && validateResult.url) {
      const realUrl = validateResult.url;
      if (autoDownload || forceDownloaded) await download(realUrl);
      else setUrl(realUrl);
    }
  }

  function getConfig(): DownloadConfig {
    return {
      output_path: downloadPath,
      quality: !onlyAudio ? quality.toLowerCase() : "bestaudio",
      audio_format:
        formatAudio !== "auto" && onlyAudio ? formatAudio.toLowerCase() : null,
      video_format: format !== "auto" ? format.toLowerCase() : null,
      extract_audio: onlyAudio,
      embed_subs: embedSubs,
      embed_thumbnail: embedThumbnail,
      write_subs: writeSubs,
      embed_metadata: embedMetadata,
      write_live_chat: writeLiveChat,
      subtitle_lang: subtitleLang,
      write_thumbnail: writeThumbnail,
      write_info_json: writeInfoJson,
      custom_filename: normalizeNullableString(customFilename),
      cookies_file: normalizeNullableString(cookiesFile),
      proxy: normalizeNullableString(proxy),
      rate_limit: normalizeNullableString(rateLimit),
      retries,
      fragment_retries: fragmentRetries,
      concurrent_fragments: concurrentFragments,
      custom_options: customOptions ? JSON.parse(customOptions) : {},
      encoding: {
        video: { ...videoEncoding, codec: normalizeCodec(videoEncoding.codec) },
        audio: { ...audioEncoding, codec: normalizeCodec(audioEncoding.codec) },
        overwrite: encodingOverwrite,
        extra_global_args: encodingExtraGlobalArgs,
      } satisfies EncodingConfig,
    };
  }

  async function savePreset() {
    try {
      const config = getConfig();
      const data: SavedPreset = {
        uuid: selectedPreset || null,
        name: presetName,
        description: presetDescription,
        config,
      };
      setIsModalOpen(false);
      setSelectedPreset("");
      setPresetName("");
      setPresetDescription("");
      const response = await api.post("/preset", data);
      if (response.status !== 200) {
        toast.error(`Failed to save preset error code: ${response.status}`);
        return;
      }
      const res = await api.get("/presets");
      setPresets(res.data);
      toast.success("Preset saved successfully!");
    } catch (err) {
      toast.error(
        `Failed to save preset: ${(err as Error).message || String(err)}`,
      );
    }
  }

  async function loadPreset(uuid: string) {
    const found = presets.find((p) => p.uuid === uuid);
    if (!found) {
      toast.error("Preset Not Found!");
      return;
    }
    const config = found.config;
    if (config.extract_audio !== undefined) setOnlySound(config.extract_audio);
    if (config.embed_subs !== undefined)
      setUserPrefEmbedSubtitles(config.embed_subs);
    if (config.embed_thumbnail !== undefined)
      setUserPrefEmbedThumbnail(config.embed_thumbnail);
    if (config.quality) setQuality(config.quality);
    if (config.quality === "best") setQuality("best");
    if (config.video_format) setFormat(config.video_format.toLowerCase());
    if (config.audio_format) setFormatAudio(config.audio_format.toLowerCase());
    if (config.encoding?.video) {
      setVideoEncoding((prev) => ({
        ...prev,
        ...config.encoding!.video,
        codec: config.encoding?.video?.codec ?? AUTO_CODEC,
      }));
    }
    if (config.encoding?.audio) {
      setAudioEncoding((prev) => ({
        ...prev,
        ...config.encoding!.audio,
        codec: config.encoding?.audio?.codec ?? AUTO_CODEC,
      }));
    }
    if (config.encoding?.overwrite !== undefined)
      setEncodingOverwrite(config.encoding.overwrite);
    if (config.encoding?.extra_global_args)
      setEncodingExtraGlobalArgs(config.encoding.extra_global_args);
    if (config.write_subs !== undefined) setWriteSubs(config.write_subs);
    if (config.subtitle_lang) setSubtitleLang(config.subtitle_lang);
    if (config.write_thumbnail !== undefined)
      setWriteThumbnail(config.write_thumbnail);
    if (config.write_info_json !== undefined)
      setWriteInfoJson(config.write_info_json);
    if (config.custom_filename !== undefined)
      setCustomFilename(config.custom_filename ?? "");
    if (config.cookies_file !== undefined)
      setCookiesFile(config.cookies_file ?? "");
    if (config.proxy !== undefined) setProxy(config.proxy ?? "");
    if (config.rate_limit !== undefined) setRateLimit(config.rate_limit ?? "");
    if (config.retries !== undefined) setRetries(config.retries);
    if (config.fragment_retries !== undefined)
      setFragmentRetries(config.fragment_retries);
    if (config.custom_options !== undefined)
      setCustomOptions(JSON.stringify(config.custom_options));
    setIsModalOpen(false);
    toast.success(`Loaded preset: ${found.name}`);
  }

  // ── Playlist detection & fetching ──
  async function openPlaylistModal(targetUrl: string) {
    setPendingPlaylistUrl(targetUrl);
    setPlaylistInfo(null);
    setPlaylistLoading(true);
    setPlaylistModalOpen(true);
    setUrl("");

    try {
      const res = await api.get("/playlist/info", {
        params: { url: targetUrl },
      });
      setPlaylistInfo(res.data as PlaylistInfo);
    } catch (err: any) {
      toast.error(
        `Failed to fetch playlist: ${err.message || "Unknown error"}`,
      );
      setPlaylistModalOpen(false);
    } finally {
      setPlaylistLoading(false);
    }
  }

  function handlePlaylistDownload(selectedIds: string[], concurrency: number) {
    if (!pendingPlaylistUrl) return;
    const config = getConfig();
    const request = {
      url: pendingPlaylistUrl,
      playlist_config: {
        item_config: config,
        video_ids: selectedIds.length > 0 ? selectedIds : undefined,
        concurrency,
        skip_on_error: true,
      },
    };
    sendPlaylistRequest(request, pendingPlaylistUrl);
  }

  function sendPlaylistRequest(requestData: any, targetUrl: string) {
    const playlistId = `pl_${Date.now()}`;

    // Register placeholder in progress
    setPlaylistProgress((prev) => {
      const next = new Map(prev);
      next.set(playlistId, {
        playlistId,
        title: playlistInfo?.title || targetUrl,
        totalVideos: 0,
        completedVideos: 0,
        failedVideos: 0,
        overallPercentage: 0,
        status: "fetching_info",
        children: new Map(),
      });
      return next;
    });

    const ws =
      socket ||
      (() => {
        const ws = new WebSocket("ws://localhost:8153/api/v1/ws/download");
        setSocket(ws);
        ws.onclose = () => setSocket(null);
        ws.onerror = (err) => console.error("WebSocket error:", err);
        attachWsHandlers(ws);
        return ws;
      })();

    const payload = {
      type: "playlist",
      playlist_id: playlistId,
      ...requestData,
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      ws.addEventListener("open", () => ws.send(JSON.stringify(payload)), {
        once: true,
      });
    }
  }

  function attachWsHandlers(ws: WebSocket) {
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        // ── Single video messages ──
        case "progress":
          editItemById(msg.data.id, msg.data as DownloadProgress);
          break;
        case "complete": {
          const data = msg.data as DownloadResponse;
          toast.success("Download complete! 🎉");
          popItem(data.id);
          const fullPath = `${downloadPath}\\${data.filename}`;
          if (showNotification) {
            const result = await window.api.notify(
              "Mihari",
              "Your Download has Finished",
              fullPath,
              true,
            );
            if (result) break;
          }
          if (onDownload === "play") await window.api.openFile(fullPath);
          else if (onDownload === "open_folder")
            window.api.showInFolder(fullPath);
          break;
        }
        case "error": {
          const response = msg.data as DownloadResponse;
          if (showNotification)
            window.api.notify(
              "Mihari",
              `Download error: ${response.error}`,
              "null",
              false,
            );
          if (
            typeof response.error === "string" &&
            response.error.includes("format is not available")
          )
            toast.error("Download failed 💔\nTry changing quality to Best");
          else toast.error(`Download failed 💔\n${response.error}`);
          popItem(msg.id);
          break;
        }
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        case "info_id":
          pushItem({
            id: msg.id as string,
            url: "",
            title: "Preparing…",
            status: "waiting",
            downloaded_bytes: 0,
            total_bytes: 0,
            speed: "0 B/s",
            eta: 0,
            percentage: 0,
            encoding_percentage: 0,
            encoding_fps: null,
            encoding_speed: null,
            encoding_frame: null,
            encoding_bitrate: null,
            encoding_size: null,
            encoding_time: null,
          });
          break;
        case "info_data":
          editItemById(msg.id, {
            id: msg.id as string,
            title: (msg.data as VideoInfo).title,
            status: "waiting",
          });
          break;
        case "cancelled":
          popItem(msg.id);
          break;

        // ── Playlist messages ──
        case "playlist_info": {
          const plId: string = msg.playlist_id;
          const info = msg.data;
          updatePlaylistMeta(plId, {
            title: info.title || "Playlist",
            totalVideos: info.total_videos ?? 0,
            status: "downloading",
          });
          break;
        }
        case "playlist_progress": {
          const plId: string = msg.playlist_id;
          const pl: PlaylistDownloadProgress = msg.data;

          updatePlaylistMeta(plId, {
            completedVideos: pl.completed_videos ?? 0,
            failedVideos: pl.failed_videos ?? 0,
            overallPercentage: pl.overall_percentage ?? 0,
            status: pl.status ?? "downloading",
            totalVideos: pl.total_videos ?? 0,
          });

          // Sync every active video's progress into the children map.
          // active_downloads_progress is keyed by URL; each value is a
          // DownloadProgress whose .id is the yt-dlp download ID used
          // as the key inside PlaylistProgressItem.children.
          const activeProgress = pl.active_downloads_progress ?? {};
          for (const vidProgress of Object.values(activeProgress)) {
            if (vidProgress) {
              upsertPlaylistChild(plId, vidProgress);
            }
          }
          break;
        }

        case "playlist_video_progress": {
          const plId: string = msg.playlist_id;
          upsertPlaylistChild(plId, msg.data as DownloadProgress);
          break;
        }
        case "playlist_complete": {
          const plId: string = msg.playlist_id;
          updatePlaylistMeta(plId, {
            status: "completed",
            overallPercentage: 100,
          });
          toast.success(`Playlist download complete! 🎉`);
          setTimeout(() => removePlaylist(plId), 3000);
          break;
        }
        case "playlist_error": {
          const plId: string = msg.playlist_id;
          toast.error(
            `Playlist download failed: ${msg.data?.error || "Unknown error"}`,
          );
          removePlaylist(plId);
          break;
        }
        case "playlist_cancelled": {
          const plId: string = msg.playlist_id;
          removePlaylist(plId);
          break;
        }

        default:
          console.warn("Unknown message type:", msg.type);
      }
    };
  }

  // ── Single video download ──
  async function download(customUrl?: string) {
    setUrl("");
    const finalUrl = customUrl || url;
    if (!finalUrl) {
      toast.error("Please enter a URL");
      return;
    }

    // Check if it's a playlist URL
    if (isPlaylistUrl(finalUrl)) {
      await openPlaylistModal(finalUrl);
      return;
    }

    const config = getConfig();
    const requestData: DownloadRequest = { url: finalUrl, config };

    if (!socket) {
      const ws = new WebSocket("ws://localhost:8153/api/v1/ws/download");
      setSocket(ws);
      ws.onclose = () => setSocket(null);
      ws.onerror = (err) => console.error("WebSocket error:", err);
      attachWsHandlers(ws);
      ws.onopen = () => ws.send(JSON.stringify(requestData));
    } else {
      socket.send(JSON.stringify(requestData));
    }
  }

  useEffect(() => {
    window.api.onDownloadRequest(async () => {
      await paste(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalActiveItems = progress.length + playlistProgress.size;

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-6rem)]">
      {/* ── MODE TOGGLE ── */}
      <div className="flex justify-between">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 w-fit">
          <button
            onClick={() => setOnlySound(false)}
            className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              !onlyAudio
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Video className="w-4 h-4" />
            Video
          </button>
          <button
            onClick={() => setOnlySound(true)}
            className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              onlyAudio
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Music className="w-4 h-4" />
            Audio
          </button>
        </div>
        <button
          className="flex items-center cursor-pointer gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all select-none"
          onClick={() => setIsOpen(true)}
        >
          <Settings2 className="w-4 h-4" />
          Advanced
        </button>
      </div>

      {/* ── URL INPUT ROW ── */}
      <div className="flex flex-col gap-2">
        <div className="flex">
          <div className="flex flex-1 items-center rounded-l-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-400 transition-all">
            <Clipboard
              className="w-7 h-7 p-1 rounded-lg bg-linear-to-r hover:from-cyan-400/30 hover:to-blue-400/30 ml-3 cursor-pointer"
              onClick={() => paste()}
            />
            <input
              type="url"
              className="flex-1 px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              placeholder="Paste a YouTube, Twitter, playlist, or any video URL…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && download()}
            />
            <div className="w-px bg-gray-200 dark:bg-gray-700 my-2" />
            <div className="flex items-center px-2 gap-1">
              {!onlyAudio ? (
                <>
                  <Dropdown
                    items={VIDEO_QUALITIES.map((i) => ({
                      label: i.label,
                      value: i.value,
                    }))}
                    value={quality}
                    onSelect={setQuality}
                    variant="minimal"
                    size="sm"
                    searchable={false}
                    width="trigger"
                  />
                  <div className="w-px bg-gray-200 dark:bg-gray-700 h-5" />
                  <Dropdown
                    items={VIDEO_FORMATS.map((i) => ({
                      label: i.label,
                      value: i.value,
                    }))}
                    value={format}
                    onSelect={setFormat}
                    variant="minimal"
                    size="sm"
                    searchable={false}
                    width="trigger"
                  />
                </>
              ) : (
                <Dropdown
                  items={AUDIO_FORMATS.map((i) => ({
                    label: i.label,
                    value: i.value,
                  }))}
                  value={formatAudio}
                  onSelect={setFormatAudio}
                  variant="minimal"
                  size="sm"
                  searchable={false}
                  width="trigger"
                />
              )}
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700 my-2" />
          </div>
          <button
            onClick={() => download()}
            className="flex cursor-pointer items-center gap-2 px-4 rounded-r-xl bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold shadow-md hover:shadow-indigo-500/30 transition-all select-none"
          >
            <Download className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        {/* ── CONTROLS ROW ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-5">
            <Switch
              name="Embed Subs"
              property={embedSubs}
              setProperty={(value) => setUserPrefEmbedSubtitles(value)}
              disabled={!isSubtitleSupported}
            />
            <Switch
              name="Thumbnail"
              property={embedThumbnail}
              setProperty={(value) => setUserPrefEmbedThumbnail(value)}
              disabled={!isThumbnailSupported}
            />
          </div>
          {/* Playlist URL indicator */}
          {url && isPlaylistUrl(url) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              <ListVideo className="w-3.5 h-3.5" />
              Playlist detected
            </div>
          )}
        </div>
      </div>

      {/* ── ACTIVE DOWNLOADS ── */}
      {totalActiveItems > 0 && (
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Active ({totalActiveItems})
            </span>
            <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            {/* Single downloads */}
            {progress.map((item) => (
              <DownloadItem key={item.id} itemProgress={item} cancel={cancel} />
            ))}
            {/* Playlist downloads */}
            {Array.from(playlistProgress.values()).map((pl) => (
              <PlaylistProgressCard
                key={pl.playlistId}
                item={pl}
                cancel={cancel}
                cancelPlaylist={cancelPlaylist}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── PRESET BUTTONS ── */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
          Presets
        </span>
        <button
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 transition-all select-none"
          onClick={() => {
            setModal("save");
            setIsModalOpen(true);
          }}
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-all select-none"
          onClick={() => {
            setModal("load");
            setIsModalOpen(true);
          }}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Load
        </button>
        {presets.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap ml-1">
            {presets.slice(0, 4).map((p) => (
              <button
                key={p.uuid}
                onClick={() => loadPreset(p.uuid)}
                title={p.description || p.name}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 border border-gray-200 dark:border-gray-700 transition-all select-none truncate max-w-22.5"
              >
                {p.name}
              </button>
            ))}
            {presets.length > 4 && (
              <button
                onClick={() => {
                  setModal("load");
                  setIsModalOpen(true);
                }}
                className="px-2 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors select-none"
              >
                +{presets.length - 4} more
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── ADVANCED SIDEBAR ── */}
      <AdvanceSidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        writeSubs={writeSubs}
        setWriteSubs={setWriteSubs}
        subtitleLang={subtitleLang}
        setSubtitleLang={setSubtitleLang}
        writeThumbnail={writeThumbnail}
        setWriteThumbnail={setWriteThumbnail}
        writeInfoJson={writeInfoJson}
        setWriteInfoJson={setWriteInfoJson}
        customFilename={customFilename}
        setCustomFilename={setCustomFilename}
        cookiesFile={cookiesFile}
        setCookiesFile={setCookiesFile}
        proxy={proxy}
        setProxy={setProxy}
        rateLimit={rateLimit}
        setRateLimit={setRateLimit}
        retries={retries}
        setRetries={setRetries}
        fragmentRetries={fragmentRetries}
        setFragmentRetries={setFragmentRetries}
        concurrentFragments={concurrentFragments}
        setConcurrentFragments={setConcurrentFragments}
        customOptions={customOptions}
        setCustomOptions={setCustomOptions}
        embedMetadata={embedMetadata}
        setEmbedMetadata={setEmbedMetadata}
        writeLiveChat={writeLiveChat}
        setWriteLiveChat={setWriteLiveChat}
        videoEncoding={videoEncoding}
        setVideoEncoding={setVideoEncoding}
        audioEncoding={audioEncoding}
        setAudioEncoding={setAudioEncoding}
        encodingOverwrite={encodingOverwrite}
        setEncodingOverwrite={setEncodingOverwrite}
        encodingExtraGlobalArgs={encodingExtraGlobalArgs}
        setEncodingExtraGlobalArgs={setEncodingExtraGlobalArgs}
      />

      {/* ── PLAYLIST MODAL ── */}
      <PlaylistModal
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
        playlistInfo={playlistInfo}
        isLoading={playlistLoading}
        onDownload={handlePlaylistDownload}
      />

      {/* ── PRESET MODAL ── */}
      <Modal
        modalType={modal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        {modal === "save" ? (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-linear-to-br from-teal-400 to-blue-500 rounded-xl mb-2 shadow-lg">
                <Save className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Save Preset
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Save your current settings for later use
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await savePreset();
              }}
              autoComplete="off"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="My preset name"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    required
                    maxLength={40}
                  />
                  <Dropdown
                    size="sm"
                    maxHeight="200px"
                    items={presets.map((preset) => ({
                      label: preset.name,
                      value: preset.uuid,
                      onClick: () => {
                        setSelectedPreset(preset.uuid);
                        setPresetName(preset.name);
                        setPresetDescription(preset.description);
                      },
                    }))}
                    value={selectedPreset}
                    onSelect={(uuid) => {
                      setSelectedPreset(uuid);
                      const found = presets.find((p) => p.uuid === uuid);
                      if (found) {
                        setPresetName(found.name);
                        setPresetDescription(found.description);
                      }
                    }}
                    placeholder="Overwrite…"
                    searchable
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                  rows={2}
                  maxLength={120}
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                disabled={!presetName.trim()}
              >
                <Save className="w-4 h-4" />
                Save Preset
              </button>
            </form>
          </div>
        ) : modal === "load" ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-linear-to-br from-teal-400 to-blue-500 rounded-xl mb-2 shadow-lg">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Load Preset
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Choose a preset to restore settings
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportAllPresets}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Export All
              </button>
              <button
                onClick={() => importPreset()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Import
              </button>
            </div>

            {presets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Archive className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No presets yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Save your first preset to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {presets.map((preset) => (
                  <div
                    key={preset.uuid}
                    className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-gray-800/50 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all cursor-pointer"
                    onClick={() => loadPreset(preset.uuid)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 shrink-0 bg-linear-to-br from-teal-400 to-blue-500 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {preset.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {preset.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportPreset(preset.name, preset.uuid);
                        }}
                        title="Export"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.uuid);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300">
              Unknown modal type
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
