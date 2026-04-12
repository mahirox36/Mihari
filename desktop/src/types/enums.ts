export enum Preset {
  ULTRAFAST = "ultrafast",
  SUPERFAST = "superfast",
  VERYFAST = "veryfast",
  FASTER = "faster",
  FAST = "fast",
  MEDIUM = "medium",
  SLOW = "slow",
  SLOWER = "slower",
  VERYSLOW = "veryslow",
  PLACEBO = "placebo",
}
export enum AudioCodec {
  AAC = "aac",
  MP3 = "libmp3lame",
  OPUS = "libopus",
  VORBIS = "libvorbis",
  FLAC = "flac",
  ALAC = "alac",
  AC3 = "ac3",
  EAC3 = "eac3",
  DTS = "dca",
  PCM_S16LE = "pcm_s16le",
  PCM_S24LE = "pcm_s24le",
  PCM_S32LE = "pcm_s32le",
  PCM_F32LE = "pcm_f32le",
  AMR_NB = "libopencore_amrnb",
  AMR_WB = "libopencore_amrwb",
  WAVPACK = "wavpack",
  COPY = "copy",
}
export enum TuneOptions {
  FILM = "film",
  ANIMATION = "animation",
  GRAIN = "grain",
  STILLIMAGE = "stillimage",
  FASTDECODE = "fastdecode",
  ZEROLATENCY = "zerolatency",
  PSNR = "psnr",
  SSIM = "ssim",
}
export enum SubtitleFormat {
  SRT = "srt",
  VTT = "vtt",
  ASS = "ass",
  LRC = "lrc",
}
export enum AudioChannels {
  MONO = "1",
  STEREO = "2",
  SURROUND_5_1 = "6",
  SURROUND_7_1 = "8",
}
export enum PixelFormat {
  YUV420P = "yuv420p",
  YUV422P = "yuv422p",
  YUV444P = "yuv444p",
  YUV420P10LE = "yuv420p10le",
  YUV422P10LE = "yuv422p10le",
  YUV444P10LE = "yuv444p10le",
  YUV420P12LE = "yuv420p12le",
  RGB24 = "rgb24",
  RGBA = "rgba",
  GBRP = "gbrp",
  GBRP10LE = "gbrp10le",
}
export enum VideoCodec {
  // Software codecs
  H264 = "libx264",
  H265 = "libx265",
  VP9 = "libvpx-vp9",
  VP8 = "libvpx",
  AV1 = "libaom-av1",
  AV1_SVT = "libsvtav1",
  AV1_RAV1E = "librav1e",

  // Hardware accelerated (NVIDIA),
  H264_NVENC = "h264_nvenc",
  HEVC_NVENC = "hevc_nvenc",
  AV1_NVENC = "av1_nvenc",

  // Hardware accelerated (Intel QSV)
  H264_QSV = "h264_qsv",
  HEVC_QSV = "hevc_qsv",
  AV1_QSV = "av1_qsv",

  // Hardware accelerated (AMD AMF)
  H264_AMF = "h264_amf",
  HEVC_AMF = "hevc_amf",

  // Hardware accelerated (Apple VideoToolbox)
  H264_VIDEOTOOLBOX = "h264_videotoolbox",
  HEVC_VIDEOTOOLBOX = "hevc_videotoolbox",

  // Vulkan
  H264_VULKAN = "h264_vulkan",
  HEVC_VULKAN = "hevc_vulkan",

  // Other
  MJPEG = "mjpeg",
  PRORES = "prores",
  DNXHD = "dnxhd",
  THEORA = "libtheora",
  H263 = "h263",
  H261 = "h261",
  CINEFORM = "cineform",
  COPY = "copy",
}
