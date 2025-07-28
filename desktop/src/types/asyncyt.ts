import { AudioCodec, Preset, VideoCodec } from "./enums";

export type FFmpegProgress = {
  frame: number;
  fps: number;
  bitrate: string;
  total_size: number;
  out_time_us: number;
  speed: string;
  progress: string;
};

export type DownloadProgress = {
  id: string;
  url: string;
  info: VideoInfo;
  status: string;
  downloaded_bytes: number;
  total_bytes: number;
  speed: number;
  eta: number;
  percentage: number;
  ffmpeg_progress: FFmpegProgress;
};

export type StartupResponse = {
  type:
    | "error"
    | "complete"
    | "progress"
    | "ping"
    | "info_id"
    | "info_data"
    | "cancelled";
  data?: SetupProgress; // only in progress
  error?: string;
};

export type DownloadFileProgress = {
  status: "downloading" | "extracting";
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
};

export type SetupProgress = {
  file: "yt-dlp" | "ffmpeg";
  download_file_progress: DownloadFileProgress;
};

export type VideoInfo = {
  url: string;
  title: string;
  duration: number;
  uploader: string;
  view_count: number;
  like_count?: number;
  description: string;
  thumbnail: string;
  upload_date: string;
  formats: Array<Record<string, any>>;
};

export type DownloadResponse = {
  id: string;
  success: boolean;
  message: string;
  filename?: string;
  video_info?: VideoInfo;
  error?: string;
};

export type PlaylistResponse = {
  success: boolean;
  message: string;
  downloaded_files: Array<string>;
  failed_downloads: Array<string>;
  total_videos: number;
  successful_downloads: number;
  error?: string;
};

export type HealthResponse = {
  status: string;
  yt_dlp_available: boolean;
  ffmpeg_available: boolean;
  version: string;
  binaries_path?: string;
  error?: string;
};

export type FFmpegConfig = {
  video_codec: VideoCodec;
  video_bitrate?: string | null;
  crf?: number | null;
  preset: Preset;
  audio_codec: AudioCodec;
  audio_bitrate?: number | null;
  audio_sample_rate?: number | null;
  no_codec_compatibility_error: boolean;
};

export type DownloadConfig = {
  output_path: string;
  quality?: string;
  audio_format?: string;
  video_format?: string;
  extract_audio?: boolean;
  embed_subs?: boolean;
  write_subs?: boolean;
  subtitle_lang?: string;
  write_thumbnail?: boolean;
  embed_thumbnail?: boolean;
  embed_metadata?: boolean;
  write_info_json?: boolean;
  custom_filename?: string;
  cookies_file?: string;
  proxy?: string;
  rate_limit?: string;
  retries?: number;
  fragment_retries?: number;
  custom_options?: Record<string, any>;
  ffmpeg_config: FFmpegConfig;
};

export type DownloadRequest = {
  url: string;
  config?: DownloadConfig;
};

export type SearchRequest = {
  query: string;
  max_results: number;
};

export type PlaylistRequest = {
  url: string;
  config?: DownloadConfig;
  max_videos: number;
};

export type MessageProgress = {
  type: "progress";
  data: DownloadProgress;
};

export type MessageComplete = {
  type: "complete";
  data: DownloadResponse;
};
export type MessageError = {
  type: "error";
  data: Record<"error", string>;
};

export type MessagePing = {
  type: "ping";
};

export type Message =
  | MessageProgress
  | MessageComplete
  | MessageError
  | MessagePing;

export type HealthStatus = {
  status: string;
  yt_dlp_available: boolean;
  ffmpeg_available: boolean;
  version: string;
  binaries_path?: string;
  error?: string;
};
