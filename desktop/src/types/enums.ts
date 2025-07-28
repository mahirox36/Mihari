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
  AMR_NB = "libopencore_amrnb",
  AMR_WB = "libopencore_amrwb",
  WAVPACK = "wavpack",
  COPY = "copy",
}
export enum VideoCodec {
  H264 = "libx264",
  H265 = "libx265",
  VP9 = "libvpx-vp9",
  VP8 = "libvpx",
  AV1 = "libaom-av1",

  // Hardware accelerated (NVIDIA)
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
