import { useEffect, useState } from "react";
import {
  Clipboard,
  Sparkles,
  Monitor,
  Play,
  Square,
  FileVideo2,
  Film,
  Globe,
  FileArchive,
  Music,
  Radio,
  Settings2,
  Download,
  Crown,
  Disc3,
  X,
  Smartphone,
  Mic,
  Apple,
  Upload,
  Save,
  FolderOpen,
  AlertCircle,
  Trash2,
  Settings,
  Archive,
} from "lucide-react";
import { Dropdown, GridedButton, Switch } from "./Keys";
import {
  DownloadRequest,
  DownloadConfig,
  DownloadProgress,
  DownloadResponse,
  VideoInfo,
  LoadedPreset,
  SavedPreset,
} from "../types/asyncyt";
import toast from "react-hot-toast";
import { AdvanceSidebar } from "./AdvanceSidebar";
import { AudioCodec, Preset, VideoCodec } from "../types/enums";
import { useHotkeys } from "../hooks/shortcutManager";
import Modal from "./Modal";
import { api } from "../api";

interface HomeProp {
  autoPaste: boolean;
  autoDownload: boolean;
  showNotification: boolean;
  downloadPath: string;
  onDownload: string;
}

function formatETA(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface DownloadItemProb {
  itemProgress: DownloadProgress;
  cancel: (itemID: string) => void;
}

function DownloadItem({ itemProgress, cancel }: DownloadItemProb) {
  return (
    <div className="group relative bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/40 dark:from-indigo-900/20 dark:via-cyan-900/20 dark:to-teal-900/20 backdrop-blur-sm border border-white/20 dark:border-cyan-600/30 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-cyan-500/10 before:to-teal-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg shadow-md">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
            {itemProgress.info.title}
          </h3>
          <p className="text-sm font-medium text-blue-600 dark:text-cyan-400 capitalize">
            {itemProgress.status}
          </p>
        </div>
      </div>

      {/* Progress bar with cancel button */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {Math.round(itemProgress.percentage)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {itemProgress.speed} • ETA: {formatETA(itemProgress.eta)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${itemProgress.percentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full animate-pulse"></div>
            </div>
          </div>
          <button
            onClick={() => cancel(itemProgress.id)}
            className="group/btn relative overflow-hidden bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500/25 flex items-center justify-center gap-1.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            <X className="w-6 h-6 relative z-10" />
          </button>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
      <div className="absolute bottom-3 left-3 w-1 h-1 bg-teal-500 rounded-full animate-ping"></div>
    </div>
  );
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
  const [embedSubs, setEmbedSubs] = useState(true);
  const [embedOriginalSubs, setOriginalEmbedSubs] = useState(true);
  // const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [quality, setQuality] = useState("1080p");
  const [format, setFormat] = useState("MP4");
  const [formatAudio, setFormatAudio] = useState("MP3");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [progress, setProgress] = useState<Array<DownloadProgress>>([]);

  // Advance Sidebar
  const [isOpen, setIsOpen] = useState(false);
  const [videoCodec, setVideoCodec] = useState(VideoCodec.COPY);
  const [videoBitrate, setVideoBitrate] = useState<null | string>(null);
  const [crf, setCrf] = useState<null | number>(null);
  const [preset, setPreset] = useState(Preset.MEDIUM);
  const [audioCodec, setAudioCodec] = useState(AudioCodec.COPY);
  const [audioBitrate, setAudioBitrate] = useState<null | number>(null);
  const [audioSampleRate, setAudioSampleRate] = useState<null | number>(null);
  const [noCodecCompatibilityError, setNoCodecCompatibilityError] =
    useState(true);
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
  const [customOptions, setCustomOptions] = useState<string>("");

  // Presets
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modal, setModal] = useState("save");
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [presets, setPresets] = useState<Array<LoadedPreset>>([]);

  useHotkeys([
    { key: "v", ctrl: true, action: () => paste() },
    { key: "d", ctrl: true, action: () => download() },
    { key: "q", ctrl: true, action: () => setOnlySound(!onlyAudio) },
    { key: "a", ctrl: true, action: () => setIsOpen(!isOpen) },
    {
      key: "s",
      ctrl: true,
      action: () => {
        if (modal === "load" && isModalOpen) {
          setModal("save");
        } else {
          setIsModalOpen(!isModalOpen);
          setModal("save");
        }
      },
    },
    {
      key: "x",
      ctrl: true,
      action: () => {
        if (modal === "save" && isModalOpen) {
          setModal("load");
        } else {
          setIsModalOpen(!isModalOpen);
          setModal("load");
        }
      },
    },
    { key: "escape", action: () => setIsModalOpen(false) },
  ]);

  useEffect(() => {
    if (!onlyAudio) setOriginalEmbedSubs(embedSubs);
  }, [embedSubs]);

  useEffect(() => {
    setEmbedSubs(onlyAudio ? false : embedOriginalSubs);
  }, [onlyAudio]);

  function pushItem(newItem: DownloadProgress) {
    setProgress((prev) => (prev ? [...prev, newItem] : [newItem]));
  }

  function popItem(id: string) {
    setProgress((prev) => prev.filter((item) => item.id !== id));
  }

  function editItemById(id: string, newItem: DownloadProgress) {
    setProgress((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          ...newItem,
          info: newItem.info ?? item.info,
        };
      })
    );
  }

  async function cancel(itemID: string) {
    socket?.send(JSON.stringify({ type: "cancel", id: itemID }));
    popItem(itemID);
  }
  function validateUrl(url: string) {
    if (!url || typeof url !== "string")
      return { isValid: false, error: "input is not string" };

    try {
      const urlObj = new URL(url);

      // Basic URL structure validation
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return { isValid: false, error: "it's not a URL" };
      }

      return {
        isValid: true,
        url: url.trim(),
      };
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
  }, []);

  useEffect(() => {
    window.api.onOpenFile((filePath: string) => {
      importPreset(filePath);
    });
  }, []);

  async function importPreset(filePath?: string) {
    if (!filePath) {
      const response = await window.api.selectMihariPresetFile();
      if (response.cancelled) {
        return; // User cancelled the file selection
      }
      if (!response.success || !response.paths) {
        toast.error(
          `Failed to select preset file: ${response.error || "Unknown error"}`
        );
        return;
      }
      for (const path of response.paths) {
        const result = await window.api.handleFile(path);
        console.log(result);
        if (result.status === "success") {
          toast.success(result.message);
        } else {
          toast.error(
            `Failed to import file: ${result.error || "Unknown error"}`
          );
        }
      }
    } else {
      const result = await window.api.handleFile(filePath);
      if (result.status === "success") {
        toast.success(result.message);
      } else {
        toast.error(
          `Failed to import file: ${result.error || "Unknown error"}`
        );
      }
    }
    const res = await api.get("/presets");
    setPresets(res.data);
  }

  async function exportPreset(name: string, uuid: string) {
    const file = await window.api.saveMihariPresetFile(name);
    if (file.cancelled) {
      return; // User cancelled the file selection
    }
    if (!file || !file.path) {
      toast.error("Failed to select export path for preset");
      return;
    }
    console.log(file.path);
    const response = await api.post("/presets/export", {
      uuid,
      path: file.path,
    });
    if (response.data.status === "failed") {
      toast.error(`Failed to export preset: ${name}`);
      console.error(response.data);
      return;
    } else {
      toast.success(`Preset ${name} exported successfully to ${file.path}!`);
    }
  }
  async function exportAllPresets() {
    const file = await window.api.saveMihariPresetFile("all_presets");
    if (file.cancelled) {
      return; // User cancelled the file selection
    }
    if (!file || !file.path) {
      toast.error("Failed to select export path for all presets");
      return;
    }
    console.log(file.path);
    const response = await api.post("/presets/export/all", { path: file.path });
    if (response.data.status === "failed") {
      toast.error(`Failed to export all presets: ${response.data.error}`);
      console.error(response.data);
      return;
    }
    toast.success(
      `All presets exported successfully to ${response.data.message}`
    );
  }

  async function deletePreset(uuid: string) {
    const response = await api.delete(`/presets/${uuid}`);
    if (response.data.status === "failed") {
      toast.error(`Failed to delete preset: ${response.data.error}`);
      console.error(response.data);
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
  function getConfig() {
    const config: DownloadConfig = {
      output_path: downloadPath,
      quality: !onlyAudio ? quality.toLowerCase() : "bestaudio",
      audio_format: formatAudio.toLocaleLowerCase(),
      video_format: format.toLocaleLowerCase(),
      extract_audio: onlyAudio,
      embed_subs: embedSubs,
      embed_thumbnail: embedThumbnail,
      write_subs: writeSubs,
      subtitle_lang: subtitleLang,
      write_thumbnail: writeThumbnail,
      write_info_json: writeInfoJson,
      custom_filename: customFilename,
      cookies_file: cookiesFile,
      proxy,
      rate_limit: rateLimit,
      retries,
      fragment_retries: fragmentRetries,
      custom_options: customOptions ? JSON.parse(customOptions) : {},
      ffmpeg_config: {
        video_codec: videoCodec,
        video_bitrate: videoBitrate,
        crf: crf,
        preset: preset,
        audio_codec: audioCodec,
        audio_bitrate: audioBitrate,
        audio_sample_rate: audioSampleRate,
        no_codec_compatibility_error: noCodecCompatibilityError,
      },
    };
    return config;
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
        console.error(response);
        return;
      }
      const res = await api.get("/presets");
      setPresets(res.data);
      toast.success("Preset saved successfully!");
    } catch (err) {
      toast.error(
        `Failed to save preset: ${(err as Error).message || String(err)}`
      );
      console.error(`Failed to save preset: ${err}`);
    }
  }
  async function loadPreset(uuid: string) {
    const selectedPreset = presets.find((p) => p.uuid === uuid);
    if (!selectedPreset) {
      toast.error("Preset Not Found!");
      return;
    }
    const config = selectedPreset.config;
    if (config.extract_audio !== undefined) setOnlySound(config.extract_audio);
    if (config.embed_subs !== undefined) setEmbedSubs(config.embed_subs);
    if (config.embed_thumbnail !== undefined)
      setEmbedThumbnail(config.embed_thumbnail);
    if (config.quality) setQuality(config.quality);
    if (config.quality === "best") setQuality("Best");
    if (config.video_format) setFormat(config.video_format.toUpperCase());
    if (config.audio_format) setFormatAudio(config.audio_format.toUpperCase());
    if (config.ffmpeg_config) {
      if (config.ffmpeg_config.video_codec)
        setVideoCodec(config.ffmpeg_config.video_codec);
      if (config.ffmpeg_config.video_bitrate !== undefined)
        setVideoBitrate(config.ffmpeg_config.video_bitrate);
      if (config.ffmpeg_config.crf !== undefined)
        setCrf(config.ffmpeg_config.crf);
      if (config.ffmpeg_config.preset) setPreset(config.ffmpeg_config.preset);
      if (config.ffmpeg_config.audio_codec)
        setAudioCodec(config.ffmpeg_config.audio_codec);
      if (config.ffmpeg_config.audio_bitrate !== undefined)
        setAudioBitrate(config.ffmpeg_config.audio_bitrate);
      if (config.ffmpeg_config.audio_sample_rate !== undefined)
        setAudioSampleRate(config.ffmpeg_config.audio_sample_rate);
      if (config.ffmpeg_config.no_codec_compatibility_error !== undefined)
        setNoCodecCompatibilityError(
          config.ffmpeg_config.no_codec_compatibility_error
        );
    }
    if (config.write_subs !== undefined) setWriteSubs(config.write_subs);
    if (config.subtitle_lang) setSubtitleLang(config.subtitle_lang);
    if (config.write_thumbnail !== undefined)
      setWriteThumbnail(config.write_thumbnail);
    if (config.write_info_json !== undefined)
      setWriteInfoJson(config.write_info_json);
    if (config.custom_filename !== undefined)
      setCustomFilename(config.custom_filename);
    if (config.cookies_file !== undefined) setCookiesFile(config.cookies_file);
    if (config.proxy !== undefined) setProxy(config.proxy);
    if (config.rate_limit !== undefined) setRateLimit(config.rate_limit);
    if (config.retries !== undefined) setRetries(config.retries);
    if (config.fragment_retries !== undefined)
      setFragmentRetries(config.fragment_retries);
    if (config.custom_options !== undefined)
      setCustomOptions(JSON.stringify(config.custom_options));
    setIsModalOpen(false);
  }

  async function download(customUrl?: string) {
    setUrl("");
    const finalUrl = customUrl || url;
    const config = getConfig();
    console.log(config);
    const requestData: DownloadRequest = {
      url: finalUrl,
      config,
    };
    if (!socket) {
      const ws = new WebSocket("ws://localhost:8153/api/v1/ws/download");
      setSocket(ws);

      ws.onopen = () => {
        ws.send(JSON.stringify(requestData));
      };
      ws.onclose = () => {
        setSocket(null);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "progress":
            editItemById(msg.data.id, msg.data as DownloadProgress);
            break;

          case "complete":
            toast.success("Download complete! 🎉");
            const data = msg.data as DownloadResponse;
            popItem(data.id);
            if (showNotification) {
              const result = await window.api.notify(
                "Mihari",
                "Your Download has Finished",
                `${downloadPath}/${data.filename}`,
                true
              );
              if (result) break;
            }
            console.log(onDownload);
            if (onDownload === "play") {
              console.log(`${downloadPath}/${data.filename}`);
              const result = await window.api.openFile(`${data.filename}`);
              console.log(result);
            } else if (onDownload === "open_folder") {
              window.api.showInFolder(`${data.filename}`);
            }
            break;

          case "error":
            const response = msg.data as DownloadResponse;
            if (showNotification) {
              window.api.notify(
                "Mihari",
                `Your Download Got an error: ${response.error}`,
                `null`,
                false
              );
            }
            if (
              typeof response.error === "string" &&
              response.error.includes("format is not available")
            ) {
              toast.error(`Download failed 💔\nTry change the quality to best`);
            } else {
              toast.error(`Download failed 💔\n${response.error}`);
            }
            console.error("Download error:", response.error);
            popItem(msg.id);
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          case "info_id":
            pushItem({
              id: msg.id as string,
              url,
              info: {
                url,
                title: "...",
                duration: 0,
                uploader: "...",
                view_count: 0,
                like_count: 0,
                description: "...",
                thumbnail: "...",
                upload_date: "...",
                formats: [],
              },
              status: "Waiting",
              downloaded_bytes: 0,
              total_bytes: 0,
              speed: 0,
              eta: 0,
              percentage: 0,
              ffmpeg_progress: {
                frame: 0,
                fps: 0,
                bitrate: "",
                total_size: 0,
                out_time_us: 0,
                speed: "",
                progress: "",
              },
            });
            break;

          case "info_data":
            editItemById(msg.id, {
              id: msg.id as string,
              url,
              info: msg.data as VideoInfo,
              status: "Waiting",
              downloaded_bytes: 0,
              total_bytes: 0,
              speed: 0,
              eta: 0,
              percentage: 0,
              ffmpeg_progress: {
                frame: 0,
                fps: 0,
                bitrate: "",
                total_size: 0,
                out_time_us: 0,
                speed: "",
                progress: "",
              },
            });
            console.log(progress);
            break;
          case "cancelled":
            popItem(msg.id);
            break;

          default:
            console.warn("Unknown message type:", event);
        }
      };
    } else {
      socket.send(JSON.stringify(requestData));
    }
  }

  useEffect(() => {
    window.api.onDownloadRequest(async () => {
      console.log("LET'S GO BOYS DOWNLOAD TS");
      await paste(true);
    });
  }, []);

  return (
    <div className="flex flex-col space-y-4 p-3">
      <div className="flex justify-between mb-4">
        <div className="text-xl font-medium select-none">
          {onlyAudio ? "Download Audio" : "Download Video"}
        </div>
        <button
          className="text-lg text-indigo-500 hover:text-indigo-600 flex items-center gap-2 cursor-pointer select-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-lg"
          onClick={() => setIsOpen(true)}
        >
          <Settings2 /> Advance Options
        </button>
      </div>

      <div className="mb-1 text-md font-medium select-none">
        Video/Audio URL
      </div>
      <div className="flex space-x-2 h-13">
        <input
          type="url"
          className="flex-1 p-6 rounded-lg bg-white/80 border border-gray-200 shadow-lg text-md placeholder-gray-500 select-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 dark:text-slate-900"
          placeholder="Paste URL here or click the paste button"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="flex-initial flex items-center justify-center gap-2 p-3 w-36 rounded-lg shadow-lg transition-colors bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold text-md cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300"
          onClick={() => paste()}
        >
          <Clipboard /> Paste Link
        </button>
      </div>

      <div className="flex justify-between space-x-2">
        <div className="flex gap-6">
          <Switch
            name="Only Audio"
            property={onlyAudio}
            setProperty={setOnlySound}
          />
          <Switch
            name="Embed Subs"
            disabled={onlyAudio}
            property={embedSubs}
            setProperty={setEmbedSubs}
          />
          <Switch
            name="Embed Thumbnail"
            property={embedThumbnail}
            setProperty={setEmbedThumbnail}
          />
        </div>
        <div className="flex gap-2">
          {/* {downloading && (
            
          )} */}
          <button
            onClick={() => download()}
            className="flex items-center justify-center gap-2 p-3 w-36 rounded-lg shadow-lg transition-all bg-gradient-to-br from-indigo-500/90 to-blue-600/90 border-indigo-300/50 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400/95 hover:to-blue-500/95 hover:scale-105 text-white font-semibold text-lg cursor-pointer select-none disabled:from-indigo-300/70 disabled:to-blue-400/70 disabled:hover:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-300"
          >
            <Download /> Download
          </button>
        </div>
      </div>

      {!onlyAudio && (
        <>
          <div className="mt-4 text-lg font-medium select-none mb-1">
            Video Quality
          </div>
          <div className="flex flex-wrap gap-5">
            <GridedButton
              name="Best"
              description="Highest available quality"
              Icon={Sparkles}
              property={quality}
              setProperty={setQuality}
            />
            <GridedButton
              name="1080p"
              description="Full HD 1920×1080"
              Icon={Monitor}
              property={quality}
              setProperty={setQuality}
            />
            <GridedButton
              name="720p"
              description="HD 1280×720"
              Icon={Play}
              property={quality}
              setProperty={setQuality}
            />
            <GridedButton
              name="480p"
              description="Standard 854×480"
              Icon={Square}
              property={quality}
              setProperty={setQuality}
            />
          </div>
        </>
      )}

      {onlyAudio ? (
        <>
          <div className="mt-4 text-lg font-medium select-none mb-1">
            Audio Format
          </div>
          <div className="flex flex-wrap gap-5">
            <GridedButton
              name="BEST"
              description="Automatically selects highest quality"
              Icon={Crown}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="MP3"
              description="Universal compatibility, good compression"
              Icon={Music}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="FLAC"
              description="Lossless quality, larger file size"
              Icon={Disc3}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="AAC"
              description="Efficient compression, Apple preferred"
              Icon={Smartphone}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="OGG"
              description="Open source, good for streaming"
              Icon={Globe}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="WAV"
              description="Uncompressed, studio quality"
              Icon={Radio}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="OPUS"
              description="Modern codec, excellent for voice"
              Icon={Mic}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="M4A"
              description="Apple format, iTunes compatible"
              Icon={Apple}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 text-lg font-medium select-none mb-1">
            Video Format
          </div>
          <div className="flex flex-wrap gap-5">
            <GridedButton
              name="MP4"
              description="Universal compatibility"
              Icon={FileVideo2}
              property={format}
              setProperty={setFormat}
            />
            <GridedButton
              name="MKV"
              description="High quality container"
              Icon={Film}
              property={format}
              setProperty={setFormat}
            />
            <GridedButton
              name="WEBM"
              description="Web optimized format"
              Icon={Globe}
              property={format}
              setProperty={setFormat}
            />
            <GridedButton
              name="AVI"
              description="Legacy video format"
              Icon={FileArchive}
              property={format}
              setProperty={setFormat}
            />
          </div>
        </>
      )}
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
        customOptions={customOptions}
        setCustomOptions={setCustomOptions}
        videoCodec={videoCodec}
        setVideoCodec={setVideoCodec}
        videoBitrate={videoBitrate}
        setVideoBitrate={setVideoBitrate}
        crf={crf}
        setCrf={setCrf}
        preset={preset}
        setPreset={setPreset}
        audioCodec={audioCodec}
        setAudioCodec={setAudioCodec}
        audioBitrate={audioBitrate}
        setAudioBitrate={setAudioBitrate}
        audioSampleRate={audioSampleRate}
        setAudioSampleRate={setAudioSampleRate}
        noCodecCompatibilityError={noCodecCompatibilityError}
        setNoCodecCompatibilityError={setNoCodecCompatibilityError}
      />
      <ul className="flex flex-col gap-4">
        {progress.map((item) => (
          <DownloadItem key={item.id} itemProgress={item} cancel={cancel} />
        ))}
      </ul>

      <div className="flex justify-between items-center">
        <button
          className="group relative px-6 py-3 bg-gradient-to-r from-teal-50 to-blue-100 hover:from-teal-100 hover:to-blue-200 dark:from-cyan-900/20 dark:to-blue-900/20 dark:hover:from-cyan-800/30 dark:hover:to-blue-800/30 border border-teal-200 hover:border-blue-300 dark:border-cyan-700 dark:hover:border-blue-600 text-teal-600 hover:text-blue-700 dark:text-cyan-300 dark:hover:text-blue-300 font-medium rounded-xl flex items-center gap-3 cursor-pointer select-none transition-all duration-200 ease-out transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-cyan-900/50 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:scale-[1.02] active:scale-[0.98]"
          onClick={() => {
            setModal("save");
            setIsModalOpen(true);
          }}
        >
          <Save className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
          <span className="text-sm font-semibold tracking-wide">
            Save Preset
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400/0 via-blue-400/5 to-indigo-400/0 dark:from-cyan-400/0 dark:via-blue-400/10 dark:to-indigo-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        <button
          className="group relative px-6 py-3 bg-gradient-to-r from-teal-50 to-blue-100 hover:from-teal-100 hover:to-blue-200 dark:from-cyan-900/20 dark:to-blue-900/20 dark:hover:from-cyan-800/30 dark:hover:to-blue-800/30 border border-teal-200 hover:border-blue-300 dark:border-cyan-700 dark:hover:border-blue-600 text-teal-600 hover:text-blue-700 dark:text-cyan-300 dark:hover:text-blue-300 font-medium rounded-xl flex items-center gap-3 cursor-pointer select-none transition-all duration-200 ease-out transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-cyan-900/50 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:scale-[1.02] active:scale-[0.98]"
          onClick={() => {
            setModal("load");
            setIsModalOpen(true);
          }}
        >
          <FolderOpen className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
          <span className="text-sm font-semibold tracking-wide">
            Load Preset
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400/0 via-blue-400/5 to-indigo-400/0 dark:from-cyan-400/0 dark:via-blue-400/10 dark:to-indigo-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </div>

      <Modal
        modalType={modal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        {modal === "save" ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl mb-3 shadow-lg">
                <Save className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 dark:from-cyan-300 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
                Save Preset
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a new preset to save your current settings
              </p>
            </div>

            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                await savePreset();
              }}
              autoComplete="off"
            >
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Preset Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name"
                    className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-cyan-400 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                    maxLength={40}
                  />
                  <Dropdown
                    size="lg"
                    maxHeight="240px"
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
                    placeholder="Pick preset"
                    searchable
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Describe your preset (optional)"
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-cyan-400 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                  rows={3}
                  maxLength={120}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="group cursor-pointer relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500 hover:from-teal-400 hover:via-blue-400 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={!presetName.trim()}
                >
                  <Save className="w-5 h-5" />
                  <span>Save Preset</span>
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>
              </div>
            </form>
          </div>
        ) : modal === "load" ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl mb-3 shadow-lg">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 dark:from-cyan-300 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
                Load Preset
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Choose a preset to load your saved settings
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await exportAllPresets();
                }}
                className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-medium rounded-xl transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Export All</span>
              </button>
              <button
                onClick={async () => {
                  await importPreset();
                }}
                className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium rounded-xl transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Import</span>
              </button>
            </div>

            {/* Presets list */}
            {presets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Archive className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No presets found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs">
                  Create and save your first preset to quickly access your
                  favorite settings
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {presets.map((preset) => (
                  <div
                    key={preset.uuid}
                    className="group relative bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-teal-200 dark:hover:border-cyan-600"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => loadPreset(preset.uuid)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                            <Settings className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                              {preset.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {preset.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          className="p-2 cursor-pointer text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                          title="Export preset"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await exportPreset(preset.name, preset.uuid);
                          }}
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 cursor-pointer text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                          title="Delete preset"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPresets((prev) =>
                              prev.filter((p) => p.uuid !== preset.uuid)
                            );
                            deletePreset(preset.uuid);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-blue-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-200 pointer-events-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Unknown Modal Type
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              The requested modal content could not be loaded.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
