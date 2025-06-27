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
  Headphones,
  Volume2,
  Settings2,
  Download,
} from "lucide-react";
import { GridedButton, Switch } from "./Keys";
import {
  DownloadRequest,
  DownloadConfig,
  DownloadProgress,
} from "../types/asyncyt";
import toast from "react-hot-toast";

interface HomeProp {
  autoPaste: boolean;
  autoDownload: boolean;
  downloadPath: string;
}

export function Home({ autoPaste, autoDownload, downloadPath }: HomeProp) {
  const [url, setUrl] = useState("");
  const [onlyAudio, setOnlySound] = useState(false);
  const [embedSubs, setEmbedSubs] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [quality, setQuality] = useState("1080p");
  const [format, setFormat] = useState("MP4");
  const [formatAudio, setFormatAudio] = useState("MP3");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  async function cancel() {
    setDownloading(false);
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

  async function paste() {
    const result = await window.api.getPaste();
    if (!result || !result.text) {
      console.error("error in the paste");
      return;
    }
    const validateResult = validateUrl(result.text);
    if (validateResult && validateResult.url) {
      const realUrl = validateResult.url;
      setUrl(realUrl);
      if (autoDownload) await download(realUrl);
    }
  }

  async function download(customUrl?: string) {
    const finalUrl = customUrl || url;
    const config: DownloadConfig = {
      output_path: downloadPath,
      quality: quality.toLowerCase(),
      audio_format: formatAudio.toLocaleLowerCase(),
      video_format: format.toLocaleLowerCase(),
      extract_audio: onlyAudio,
      embed_subs: embedSubs,
      embed_thumbnail: embedThumbnail,
    };
    const requestData: DownloadRequest = {
      url: finalUrl,
      config,
    };
    if (!socket) {
      setDownloading(true);
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

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "progress":
            setProgress(msg.data as DownloadProgress);
            break;

          case "complete":
            toast.success("Download complete! 🎉");
            setProgress(null);
            setDownloading(false);
            break;

          case "error":
            toast.error("Download failed 💔");
            console.error("Download error:", msg.error);
            setProgress(null);
            setDownloading(false);
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.warn("Unknown message type:", event);
        }
      };
    }

    if (socket && !downloading) {
      setDownloading(true);
      socket.send(JSON.stringify(requestData));
    }
  }

  function formatETA(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col space-y-4 p-3">
      <div className="flex justify-between mb-4">
        <div className="text-xl font-medium select-none">
          {onlyAudio ? "Download Audio" : "Download Video"}
        </div>
        <button className="text-lg text-indigo-500 hover:text-indigo-600 flex items-center gap-2 cursor-pointer select-none transition-colors">
          <Settings2 /> Advance Settings
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
          className="flex-initial flex items-center justify-center gap-2 p-3 w-36 rounded-lg shadow-lg transition-colors bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold text-md cursor-pointer select-none"
          onClick={paste}
        >
          <Clipboard /> Paste Link
        </button>
      </div>

      <div className="flex justify-between">
        <div className="flex gap-6">
          <Switch
            name="Only Audio"
            property={onlyAudio}
            setProperty={setOnlySound}
          />
          <Switch
            name="Embed Subs"
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
          {downloading && (
            <button
              onClick={() => cancel()}
              className="flex items-center justify-center gap-2 p-3 w-36 rounded-lg shadow-lg transition-all bg-gradient-to-tl from-red-400/90 to-red-600/90 border-orange-300/50 shadow-red-500/25 hover:shadow-red-500/40 hover:from-red-400/95 hover:to-red-500/95 hover:scale-105 text-white font-semibold text-lg cursor-pointer select-none"
            >
              <Download /> Cancel
            </button>
          )}
          <button
            onClick={() => download()}
            className="flex items-center justify-center gap-2 p-3 w-36 rounded-lg shadow-lg transition-all bg-gradient-to-br from-indigo-500/90 to-blue-600/90 border-indigo-300/50 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400/95 hover:to-blue-500/95 hover:scale-105 text-white font-semibold text-lg cursor-pointer select-none disabled:from-indigo-300/70 disabled:to-blue-400/70 disabled:hover:scale-100 disabled:cursor-not-allowed"
            disabled={downloading}
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
              name="MP3"
              description="Universal audio format"
              Icon={Music}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="FLAC"
              description="Lossless audio quality"
              Icon={Headphones}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="AAC"
              description="High efficiency codec"
              Icon={Volume2}
              property={formatAudio}
              setProperty={setFormatAudio}
            />
            <GridedButton
              name="OGG"
              description="Open source format"
              Icon={Radio}
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
      {progress && (
        <div className="bg-white/80 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-md">
          <div className="mb-1 font-medium text-sm">
            Downloading: {progress.title || "Unknown title"}
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-200 ease-out"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <div className="text-xs mt-1 text-gray-600 dark:text-gray-300">
            {Math.round(progress.percentage)}% — @ {progress.speed} | ETA:{" "}
            {formatETA(progress.eta)}
          </div>
        </div>
      )}
    </div>
  );
}
