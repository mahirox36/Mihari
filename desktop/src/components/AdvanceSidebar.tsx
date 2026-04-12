/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  X,
  Settings,
  Sparkles,
  FileText,
  Image,
  Globe,
  Zap,
  Video,
  Volume2,
  Clock,
  Gauge,
  Star,
  Music,
  SlidersHorizontal,
  Layers3,
  MessagesSquare,
} from "lucide-react";
import { CustomOptionsInput, NumberInput, Switch, TextInput } from "./inputs";
import {
  AudioChannels,
  AudioCodec,
  PixelFormat,
  Preset,
  TuneOptions,
  VideoCodec,
} from "../types/enums";
import { Dropdown } from "./Keys";
import { useSettings } from "../hooks/SettingsContext";
import { AudioEncodingConfig, VideoEncodingConfig } from "../types/asyncyt";

interface AdvanceSidebarProp {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  writeSubs: boolean;
  setWriteSubs: React.Dispatch<React.SetStateAction<boolean>>;
  subtitleLang: string;
  setSubtitleLang: React.Dispatch<React.SetStateAction<string>>;
  writeThumbnail: boolean;
  setWriteThumbnail: React.Dispatch<React.SetStateAction<boolean>>;
  writeInfoJson: boolean;
  setWriteInfoJson: React.Dispatch<React.SetStateAction<boolean>>;
  customFilename: string;
  setCustomFilename: React.Dispatch<React.SetStateAction<string>>;
  cookiesFile: string;
  setCookiesFile: React.Dispatch<React.SetStateAction<string>>;
  proxy: string;
  setProxy: React.Dispatch<React.SetStateAction<string>>;
  rateLimit: string;
  setRateLimit: React.Dispatch<React.SetStateAction<string>>;
  retries: number;
  setRetries: React.Dispatch<React.SetStateAction<number>>;
  fragmentRetries: number;
  setFragmentRetries: React.Dispatch<React.SetStateAction<number>>;
  customOptions: string;
  setCustomOptions: React.Dispatch<React.SetStateAction<string>>;
  embedMetadata: boolean;
  setEmbedMetadata: React.Dispatch<React.SetStateAction<boolean>>;
  writeLiveChat: boolean;
  setWriteLiveChat: React.Dispatch<React.SetStateAction<boolean>>;
  videoEncoding: VideoEncodingConfig;
  setVideoEncoding: React.Dispatch<React.SetStateAction<VideoEncodingConfig>>;
  audioEncoding: AudioEncodingConfig;
  setAudioEncoding: React.Dispatch<React.SetStateAction<AudioEncodingConfig>>;
  encodingOverwrite: boolean;
  setEncodingOverwrite: React.Dispatch<React.SetStateAction<boolean>>;
  encodingExtraGlobalArgs: string[];
  setEncodingExtraGlobalArgs: React.Dispatch<React.SetStateAction<string[]>>;
}

const AUTO_VALUE = "auto";

function valueOrAuto(value?: string | null) {
  return value ?? AUTO_VALUE;
}

function parseArgs(value: string) {
  return value.split(/\s+/).map((item) => item.trim()).filter(Boolean);
}

function formatArgs(args: string[]) {
  return args.join(" ");
}

// Section header
function SectionHeader({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{label}</h3>
    </div>
  );
}

export function AdvanceSidebar({
  isOpen,
  setIsOpen,
  writeSubs,
  setWriteSubs,
  subtitleLang,
  setSubtitleLang,
  writeThumbnail,
  setWriteThumbnail,
  writeInfoJson,
  setWriteInfoJson,
  customFilename,
  setCustomFilename,
  cookiesFile,
  setCookiesFile,
  proxy,
  setProxy,
  rateLimit,
  setRateLimit,
  retries,
  setRetries,
  fragmentRetries,
  setFragmentRetries,
  customOptions,
  setCustomOptions,
  embedMetadata,
  setEmbedMetadata,
  writeLiveChat,
  setWriteLiveChat,
  videoEncoding,
  setVideoEncoding,
  audioEncoding,
  setAudioEncoding,
  encodingOverwrite,
  setEncodingOverwrite,
  encodingExtraGlobalArgs,
  setEncodingExtraGlobalArgs,
}: AdvanceSidebarProp) {
  const { performanceMode } = useSettings();

  async function handleSelectCookiesFile() {
    if (!window.api?.selectCookieFile) return;
    const result = await window.api.selectCookieFile();
    if (result.success && result.path) {
      setCookiesFile(result.path);
    }
  }

  const updateVideoEncoding = (updates: Partial<VideoEncodingConfig>) => {
    setVideoEncoding((prev) => ({ ...prev, ...updates }));
  };

  const updateAudioEncoding = (updates: Partial<AudioEncodingConfig>) => {
    setAudioEncoding((prev) => ({ ...prev, ...updates }));
  };

  return (
    <>
      {isOpen && (
        <div
          className={`fixed inset-0 z-20 bg-slate-950/50 ${
            performanceMode ? "" : "backdrop-blur-sm"
          } transition-opacity duration-200`}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed top-10 right-0 z-30 h-[calc(100vh-2.5rem)] w-96 max-w-full transform border-l border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.97)_0%,rgba(12,74,110,0.15)_50%,rgba(15,23,42,0.97)_100%)] backdrop-blur-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0 shadow-2xl shadow-black/40" : "translate-x-full"
        }`}
      >
        {/* Decorative blobs */}
        {isOpen && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 right-4 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />
            <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-blue-500/8 blur-3xl" />
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Advanced Options</h2>
              <p className="text-xs text-white/50">Encoding, subtitles & more</p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center cursor-pointer justify-center rounded-lg border border-white/10 hover:border-red-400/40 hover:bg-red-500/10 transition-all duration-150"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 h-[calc(100%-64px)] overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">

          {/* ── VIDEO ENCODING ── */}
          <SectionHeader icon={Video} label="Video Encoding" color="bg-cyan-600" />

          <div className="space-y-3">
            {/* Video Codec */}
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Video className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white/80">Video Codec</span>
              </div>
              <p className="text-xs text-white/40 mb-2">Auto = backend default. Force only when needed.</p>
              <Dropdown
                items={[
                  { label: "Auto (Recommended)", value: AUTO_VALUE },
                  ...Object.entries(VideoCodec).map(([label, value]) => ({
                    label: label.replaceAll("_", " "),
                    value,
                  })),
                ]}
                value={valueOrAuto(videoEncoding.codec)}
                onSelect={(val) => updateVideoEncoding({ codec: val === AUTO_VALUE ? AUTO_VALUE : (val as VideoCodec) })}
                placeholder="Auto"
                variant="default"
                size="sm"
                searchable
                width="trigger"
              />
            </div>

            <TextInput
              name="Video Bitrate"
              description="e.g. 2500k. Leave blank to let encoder decide."
              value={videoEncoding.bitrate ?? ""}
              setValue={(v) => updateVideoEncoding({ bitrate: v.trim() || null })}
              placeholder="2500k"
              icon={Gauge}
            />

            <NumberInput
              name="CRF Quality"
              description="Lower = higher quality. 18–28 is typical."
              value={videoEncoding.crf ?? 0}
              setValue={(v) => updateVideoEncoding({ crf: v || null })}
              min={0}
              max={51}
              icon={Star}
            />

            {/* Preset */}
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white/80">Encoding Preset</span>
              </div>
              <p className="text-xs text-white/40 mb-2">Slower = better compression.</p>
              <Dropdown
                items={[
                  { label: "Auto", value: AUTO_VALUE },
                  ...Object.entries(Preset).map(([label, value]) => ({ label, value })),
                ]}
                value={valueOrAuto(videoEncoding.preset)}
                onSelect={(val) => updateVideoEncoding({ preset: val === AUTO_VALUE ? null : (val as Preset) })}
                placeholder="Auto"
                variant="default"
                size="sm"
                searchable
                width="trigger"
              />
            </div>

            {/* Tune */}
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white/80">Tune</span>
              </div>
              <Dropdown
                items={[
                  { label: "Auto", value: AUTO_VALUE },
                  ...Object.entries(TuneOptions).map(([label, value]) => ({ label, value })),
                ]}
                value={valueOrAuto(videoEncoding.tune)}
                onSelect={(val) => updateVideoEncoding({ tune: val === AUTO_VALUE ? null : val })}
                placeholder="Auto"
                variant="default"
                size="sm"
                searchable
                width="trigger"
              />
            </div>

            {/* Pixel Format */}
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Layers3 className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white/80">Pixel Format</span>
              </div>
              <Dropdown
                items={[
                  { label: "Auto", value: AUTO_VALUE },
                  ...Object.entries(PixelFormat).map(([label, value]) => ({ label, value })),
                ]}
                value={valueOrAuto(videoEncoding.pixel_format)}
                onSelect={(val) => updateVideoEncoding({ pixel_format: val === AUTO_VALUE ? null : val })}
                placeholder="Auto"
                variant="default"
                size="sm"
                searchable
                width="trigger"
              />
            </div>

            {/* Width / Height */}
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                name="Width"
                description="0 = keep original"
                value={videoEncoding.width ?? 0}
                setValue={(v) => updateVideoEncoding({ width: v || null })}
                min={0}
                max={7680}
                icon={Video}
              />
              <NumberInput
                name="Height"
                description="0 = keep original"
                value={videoEncoding.height ?? 0}
                setValue={(v) => updateVideoEncoding({ height: v || null })}
                min={0}
                max={4320}
                icon={Video}
              />
            </div>

            <NumberInput
              name="FPS"
              description="0 = keep original frame rate."
              value={videoEncoding.fps ?? 0}
              setValue={(v) => updateVideoEncoding({ fps: v || null })}
              min={0}
              max={240}
              icon={Zap}
            />

            <TextInput
              name="Video Extra Args"
              description="Extra codec-specific args separated by spaces."
              value={formatArgs(videoEncoding.extra_args)}
              setValue={(v) => updateVideoEncoding({ extra_args: parseArgs(v) })}
              placeholder="-profile:v high"
              icon={Video}
            />
          </div>

          {/* ── AUDIO ENCODING ── */}
          <SectionHeader icon={Volume2} label="Audio Encoding" color="bg-purple-600" />

          <div className="space-y-3">
            {/* Audio Codec */}
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white/80">Audio Codec</span>
              </div>
              <p className="text-xs text-white/40 mb-2">Auto = backend choice. Copy = pass through untouched.</p>
              <Dropdown
                items={[
                  { label: "Auto (Recommended)", value: AUTO_VALUE },
                  ...Object.entries(AudioCodec).map(([label, value]) => ({
                    label: label.replaceAll("_", " "),
                    value,
                  })),
                ]}
                value={valueOrAuto(audioEncoding.codec)}
                onSelect={(val) => updateAudioEncoding({ codec: val === AUTO_VALUE ? AUTO_VALUE : (val as AudioCodec) })}
                placeholder="Auto"
                variant="default"
                size="sm"
                searchable
                width="trigger"
              />
            </div>

            <TextInput
              name="Audio Bitrate"
              description="e.g. 192k"
              value={audioEncoding.bitrate ?? ""}
              setValue={(v) => updateAudioEncoding({ bitrate: v.trim() || null })}
              placeholder="192k"
              icon={Music}
            />

            <NumberInput
              name="Audio Quality"
              description="Encoder-specific quality scale (0–10)."
              value={audioEncoding.quality ?? 0}
              setValue={(v) => updateAudioEncoding({ quality: v || null })}
              min={0}
              max={10}
              icon={Star}
            />

            <NumberInput
              name="Sample Rate (Hz)"
              description="44100 or 48000 are most common."
              value={audioEncoding.sample_rate ?? 0}
              setValue={(v) => updateAudioEncoding({ sample_rate: v || null })}
              min={0}
              max={192000}
              icon={Zap}
            />

            {/* Audio Channels */}
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Music className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white/80">Channels</span>
              </div>
              <Dropdown
                items={[
                  { label: "Auto", value: AUTO_VALUE },
                  ...Object.entries(AudioChannels).map(([label, value]) => ({ label, value })),
                ]}
                value={audioEncoding.channels ? String(audioEncoding.channels) : AUTO_VALUE}
                onSelect={(val) => updateAudioEncoding({ channels: val === AUTO_VALUE ? null : parseInt(val, 10) })}
                placeholder="Auto"
                variant="default"
                size="sm"
                width="trigger"
              />
            </div>

            <TextInput
              name="Audio Extra Args"
              description="Extra codec-specific audio args."
              value={formatArgs(audioEncoding.extra_args)}
              setValue={(v) => updateAudioEncoding({ extra_args: parseArgs(v) })}
              placeholder="-application audio"
              icon={Volume2}
            />
          </div>

          {/* ── GLOBAL ENCODING ── */}
          <SectionHeader icon={Settings} label="Global Encoding" color="bg-slate-600" />

          <div className="space-y-3">
            <Switch
              name="Overwrite Existing Files"
              description="Replace files with same name during encoding."
              property={encodingOverwrite}
              setProperty={setEncodingOverwrite}
              icon={FileText}
            />

            <TextInput
              name="Global FFmpeg Args"
              description="Extra global ffmpeg args."
              value={formatArgs(encodingExtraGlobalArgs)}
              setValue={(v) => setEncodingExtraGlobalArgs(parseArgs(v))}
              placeholder="-movflags +faststart"
              icon={Settings}
            />
          </div>

          {/* ── SUBTITLES ── */}
          <SectionHeader icon={FileText} label="Subtitles" color="bg-cyan-700" />

          <div className="space-y-3">
            <Switch
              name="Write Subtitles"
              description="Download subtitle files alongside the media."
              property={writeSubs}
              setProperty={setWriteSubs}
              icon={FileText}
            />
            <TextInput
              name="Language Code"
              description="e.g. en, ar, ja, or en.* for fallback."
              value={subtitleLang}
              setValue={setSubtitleLang}
              placeholder="en"
              icon={Globe}
            />
          </div>

          {/* ── MEDIA FILES ── */}
          <SectionHeader icon={Image} label="Media & Metadata" color="bg-indigo-600" />

          <div className="space-y-3">
            <Switch
              name="Download Thumbnail"
              description="Save artwork next to output file."
              property={writeThumbnail}
              setProperty={setWriteThumbnail}
              icon={Image}
            />
            <Switch
              name="Save Info JSON"
              description="Store raw metadata for later reuse."
              property={writeInfoJson}
              setProperty={setWriteInfoJson}
              icon={FileText}
            />
            <Switch
              name="Embed Metadata"
              description="Write title, artist, etc. into the file."
              property={embedMetadata}
              setProperty={setEmbedMetadata}
              icon={Sparkles}
            />
            <Switch
              name="Write Live Chat"
              description="Save live chat logs when available."
              property={writeLiveChat}
              setProperty={setWriteLiveChat}
              icon={MessagesSquare}
            />
          </div>

          {/* ── CONFIGURATION ── */}
          <SectionHeader icon={Settings} label="Configuration" color="bg-emerald-600" />

          <div className="space-y-3">
            <TextInput
              name="Custom Filename"
              description="Output filename template."
              value={customFilename}
              setValue={setCustomFilename}
              placeholder="%(title)s.%(ext)s"
              icon={FileText}
            />
            <TextInput
              name="Cookies File"
              description="Use cookies for private / signed-in content."
              value={cookiesFile}
              setValue={setCookiesFile}
              placeholder="Select cookies file…"
              icon={FileText}
              rightButton={
                <button
                  type="button"
                  className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-medium text-white hover:from-cyan-500 hover:to-blue-500 transition-all cursor-pointer"
                  onClick={handleSelectCookiesFile}
                >
                  Browse
                </button>
              }
            />  
            <TextInput
              name="Proxy"
              description="Proxy URL for requests."
              value={proxy}
              setValue={setProxy}
              placeholder="http://proxy:port"
              icon={Globe}
            />
            <TextInput
              name="Rate Limit"
              description="e.g. 1M, 500K"
              value={rateLimit}
              setValue={setRateLimit}
              placeholder="1M"
              icon={Zap}
            />
          </div>

          {/* ── PERFORMANCE ── */}
          <SectionHeader icon={Clock} label="Performance" color="bg-orange-600" />

          <div className="space-y-3">
            <NumberInput
              name="Download Retries"
              description="Retries for main download."
              value={retries}
              setValue={setRetries}
              min={0}
              max={20}
              icon={Clock}
            />
            <NumberInput
              name="Fragment Retries"
              description="Retries for fragmented streams."
              value={fragmentRetries}
              setValue={setFragmentRetries}
              min={0}
              max={20}
              icon={Clock}
            />
          </div>

          {/* ── ADVANCED ── */}
          <SectionHeader icon={Settings} label="Advanced" color="bg-violet-600" />

          <div className="space-y-3 pb-6">
            <CustomOptionsInput value={customOptions} setValue={setCustomOptions} />
          </div>
        </div>
      </div>
    </>
  );
}