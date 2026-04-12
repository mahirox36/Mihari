/* eslint-disable @typescript-eslint/no-explicit-any */

import { AudioCodec, VideoCodec } from "./enums";

/* ----------------------------- BASIC TYPES ----------------------------- */

export type VideoInfo = {
  url: string;
  title: string;
  duration: number;
  uploader: string;
  view_count: number;
  like_count?: number | null;
  description: string;
  thumbnail: string;
  upload_date: string;
  formats: Array<Record<string, any>>;
};

/* ----------------------------- DOWNLOAD ----------------------------- */

export type DownloadProgress = {
  id: string;
  url: string;
  title: string;
  status: string;

  downloaded_bytes: number;
  total_bytes: number;
  speed: string;
  eta: number;
  percentage: number;

  encoding_percentage: number;
  encoding_fps?: number | null;
  encoding_speed?: string | null;
  encoding_frame?: number | null;
  encoding_bitrate?: string | null;
  encoding_size?: string | null;
  encoding_time?: string | null;
};

export type DownloadFileProgress = {
  status: string; // downloading | completed
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
};

export type SetupProgress = {
  file: "yt-dlp" | "ffmpeg";
  download_file_progress: DownloadFileProgress;
};

export type DownloadConfig = {
  output_path: string;
  quality: string;

  audio_format?: string | null;
  video_format?: string | null;

  extract_audio: boolean;
  embed_subs: boolean;
  write_subs: boolean;
  subtitle_lang: string;

  write_thumbnail: boolean;
  embed_thumbnail: boolean;
  embed_metadata: boolean;

  write_info_json: boolean;
  write_live_chat: boolean;

  custom_filename?: string | null;
  cookies_file?: string | null;
  proxy?: string | null;
  rate_limit?: string | null;

  retries: number;
  fragment_retries: number;

  custom_options: Record<string, any>;
  encoding: EncodingConfig;
};

export type DownloadRequest = {
  url: string;
  config?: DownloadConfig | null;
};

export type DownloadResponse = {
  success: boolean;
  message: string;
  id: string;

  filename?: string | null;
  video_info?: VideoInfo | null;
  error?: string | null;
};

/* ----------------------------- SEARCH ----------------------------- */

export type SearchRequest = {
  query: string;
  max_results: number;
};

export type SearchResponse = {
  success: boolean;
  message: string;
  results: VideoInfo[];
  total_results: number;
  error?: string | null;
};

/* ----------------------------- PLAYLIST ----------------------------- */

export type PlaylistVideoInfo = {
  id: string;
  url: string;

  title?: string | null;
  duration: number;

  uploader?: string | null;

  thumbnail?: string | null;
  thumbnails: Array<Record<string, any>>;

  upload_date: string;
  view_count: number;

  playlist_index?: number | null;
};

export type PlaylistInfo = {
  id: string;
  url: string;

  title: string;
  description?: string | null;
  uploader?: string | null;

  thumbnail?: string | null;

  entry_count: number;
  entries: PlaylistVideoInfo[];
};

export type PlaylistConfig = {
  item_config?: DownloadConfig | null;

  max_videos: number;
  start_index: number;
  end_index?: number | null;

  concurrency: number;
  skip_on_error: boolean;
  reverse: boolean;
  write_playlist_metadata: boolean;
};

export type PlaylistItemResult = {
  index: number;
  video_info: PlaylistVideoInfo;
  success: boolean;

  filepath?: string | null;
  error?: string | null;
};

export type PlaylistDownloadProgress = {
  playlist_id: string;
  playlist_info?: PlaylistInfo | null;

  status: string;

  total_videos: number;
  completed_videos: number;
  failed_videos: number;

  current_index: number;

  current_video?: PlaylistVideoInfo | null;
  current_video_progress?: DownloadProgress | null;

  overall_percentage: number;

  results: PlaylistItemResult[];
};

export type PlaylistResponse = {
  success: boolean;
  message: string;

  playlist_info?: PlaylistInfo | null;

  results: PlaylistItemResult[];

  total_videos: number;
  successful_downloads: number;
  failed_downloads: number;

  downloaded_files: string[];

  error?: string | null;
};

export type PlaylistRequest = {
  url: string;
  playlist_config?: PlaylistConfig | null;
};

/* ----------------------------- HEALTH ----------------------------- */

export type HealthResponse = {
  status: string;
  yt_dlp_available: boolean;
  ffmpeg_available: boolean;
  version: string;
  binaries_path?: string | null;
  error?: string | null;
};

/* ----------------------------- MEDIA / FILES ----------------------------- */

export type InputFile = {
  path: string;
  type: string;
  options: string[];
  stream_index?: number | null;
};

export type StreamInfo = {
  index: number;
  codec_type: string;
  codec_name?: string | null;

  width?: number | null;
  height?: number | null;

  bit_rate?: number | null;

  sample_rate?: number | null;
  channels?: number | null;

  language?: string | null;
};

export type MediaInfo = {
  filename: string;

  format_name: string;
  format_long_name: string;

  duration: number;
  size: number;
  bit_rate: number;

  streams: StreamInfo[];
};

/* ----------------------------- MESSAGES ----------------------------- */

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
  data: { error: string };
};

export type MessagePing = {
  type: "ping";
};

export type Message =
  | MessageProgress
  | MessageComplete
  | MessageError
  | MessagePing;

export type StartupResponse =
  | {
      type: "progress";
      data?: SetupProgress | null;
      error?: string | null;
    }
  | {
      type: "complete";
      data?: null;
      error?: string | null;
    }
  | {
      type: "error";
      data?: null;
      error?: string | null;
    }
  | {
      type: "ping";
      data?: null;
      error?: string | null;
    };

/* ----------------------------- ENCODING ----------------------------- */

export type VideoEncodingConfig = {
  codec?: VideoCodec | "auto" | null;

  crf?: number | null;
  bitrate?: string | null;

  maxrate?: string | null;
  bufsize?: string | null;

  preset?: string | null;
  tune?: string | null;

  pixel_format?: string | null;

  width?: number | null;
  height?: number | null;

  fps?: number | null;

  extra_args: string[];
};

export type AudioEncodingConfig = {
  codec?: AudioCodec | "auto" |  null;

  bitrate?: string | null;
  quality?: number | null;

  sample_rate?: number | null;

  channels?: number | null;

  extra_args: string[];
};

export type EncodingConfig = {
  video?: VideoEncodingConfig | null;
  audio?: AudioEncodingConfig | null;

  overwrite: boolean;

  extra_global_args: string[];
};

export type HealthStatus = {
  status: string;
  yt_dlp_available: boolean;
  ffmpeg_available: boolean;
  version: string;
  binaries_path?: string;
  error?: string;
};

export type LoadedPreset = {
  uuid: string;
  name: string;
  description: string;
  config: DownloadConfig;
};

export type SavedPreset = {
  uuid: string | null;
  name: string;
  description: string;
  config: DownloadConfig;
};
