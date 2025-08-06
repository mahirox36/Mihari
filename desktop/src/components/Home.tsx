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
} from "lucide-react";
import { GridedButton, Switch } from "./Keys";
import {
  DownloadRequest,
  DownloadConfig,
  DownloadProgress,
  DownloadResponse,
  VideoInfo,
} from "../types/asyncyt";
import toast from "react-hot-toast";
import { AdvanceSidebar } from "./AdvanceSidebar";
import { AudioCodec, Preset, VideoCodec } from "../types/enums";
import { useHotkeys } from "../hooks/shortcutManager";
import Modal from "./Modal";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  useHotkeys([
    { key: "v", ctrl: true, action: () => paste() },
    { key: "d", ctrl: true, action: () => download() },
    { key: "q", ctrl: true, action: () => setOnlySound(!onlyAudio) },
    { key: "a", ctrl: true, action: () => setIsOpen(!isOpen) },
    // { key: "x", ctrl: true, action: () => setIsModalOpen(!isModalOpen) },
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
  }, []);

  async function paste(forceDownloaded: boolean = false) {
    const result = await window.api.getPaste();
    if (!result || !result.text) {
      console.error("error in the paste");
      return;
    }
    const validateResult = validateUrl(result.text);
    if (validateResult && validateResult.url) {
      const realUrl = validateResult.url;
      if (autoDownload || forceDownloaded) await download(realUrl);
      else setUrl(realUrl);
    }
  }

  async function download(customUrl?: string) {
    setUrl("");
    const finalUrl = customUrl || url;
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">Saved Profiles</h2>
        <p>Saved Profiles Goes Here BRRRRR</p>
      </Modal>
    </div>
  );
}
