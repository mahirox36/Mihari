const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const { app } = require("electron");
const Store = require("electron-store");

// Constants
const TIMEOUT_MS = 30000; // 30 seconds timeout for format fetching
const MAX_RETRIES = 3;

class DownloadError extends Error {
  constructor(message, code = null, details = null) {
    super(message);
    this.name = 'DownloadError';
    this.code = code;
    this.details = details;
  }
}

function getBinaryPath(filename) {
  if (app.isPackaged) {
    // In production, try these paths in order:
    const paths = [
      // 1. extraResources path
      path.join(process.resourcesPath, filename),
      // 2. app directory
      path.join(app.getPath('userData'), filename),
      // 3. exe directory
      path.join(path.dirname(app.getPath('exe')), filename),

      path.join(process.resourcesPath, 'bin')
    ];
    
    // Return the first path that exists, or the userData path if none exist
    for (const p of paths) {
      if (fsSync.existsSync(p)) {
        return p;
      }
    }
    return paths[1]; // Return userData path for downloading
  }
  
  // In development
  return path.join(__dirname, "bin");
}

class Downloader {
  constructor() {
    this.store = new Store({
      schema: {
        outputPath: {
          type: 'string',
          default: path.join(os.homedir(), "Videos", "Mihari")
        },
        profiles: {
          type: 'array',
          default: []
        }
      }
    });

    this.initializePaths();
    this.currentProcess = null;
    this.cancelRequested = false;
    this.downloadQueue = [];
    this.isDownloading = false;
  }

  async initializePaths() {
    // Determine yt-dlp path with better fallback logic
    this.ytdlpPath = getBinaryPath(process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')

    if (!this.ytdlpPath) {
      throw new DownloadError(
        "yt-dlp executable not found. Please ensure yt-dlp is installed and accessible.",
        "YT_DLP_NOT_FOUND"
      );
    }

    // Initialize output directory
    this.defaultOutputPath = path.join(os.homedir(), "Videos", "Mihari");
    this.outputPath = this.store.get("outputPath", this.defaultOutputPath);
    
    await this.ensureDirectory(this.outputPath);
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath, fsSync.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      return false;
    }
  }

  // Enhanced URL validation with site support check
  validateUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      
      // Basic URL structure validation
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      return {
        isValid: true,
        url: url.trim()
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  // Enhanced format fetching with timeout and retry logic
  async getFormats(url, retryCount = 0) {
    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      throw new DownloadError("Invalid URL provided", "INVALID_URL");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (process && !process.killed) {
          process.kill();
        }
        reject(new DownloadError("Timeout while fetching formats", "TIMEOUT"));
      }, TIMEOUT_MS);

      const args = ["-J", "--flat-playlist", url];
      const process = spawn(this.ytdlpPath, args);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            const formats = this.parseFormatsFromJson(info);
            resolve(formats);
          } catch {
            // Fallback to -F format if JSON parsing fails
            this.getFormatsLegacy(url).then(resolve).catch(reject);
          }
        } else {
          const errorMessage = stderr || "Failed to fetch formats";
          
          // Retry logic for network errors
          if (retryCount < MAX_RETRIES && this.isRetryableError(errorMessage)) {
            console.log(`Retrying format fetch (${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
              this.getFormats(url, retryCount + 1).then(resolve).catch(reject);
            }, 1000 * (retryCount + 1));
          } else {
            reject(new DownloadError(errorMessage, "FORMAT_FETCH_FAILED", { stderr, code }));
          }
        }
      });

      process.on("error", (error) => {
        clearTimeout(timeout);
        reject(new DownloadError(`Process error: ${error.message}`, "PROCESS_ERROR"));
      });
    });
  }

  // Legacy format parsing as fallback
  async getFormatsLegacy(url) {
    return new Promise((resolve, reject) => {
      const args = ["-F", url];
      const process = spawn(this.ytdlpPath, args);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          const formats = this.parseFormatsFromText(stdout);
          resolve(formats);
        } else {
          reject(new DownloadError(stderr || "Failed to get formats", "FORMAT_PARSE_FAILED"));
        }
      });
    });
  }

  // Enhanced JSON format parsing
  parseFormatsFromJson(info) {
    const formats = [];
    
    if (info.formats) {
      info.formats.forEach(format => {
        const formatInfo = {
          formatId: format.format_id,
          ext: format.ext,
          resolution: format.resolution || `${format.width}x${format.height}` || 'unknown',
          filesize: this.formatFilesize(format.filesize || format.filesize_approx),
          codec: format.vcodec !== 'none' ? format.vcodec : format.acodec,
          fps: format.fps,
          quality: format.quality,
          note: format.format_note,
          url: format.url,
          type: this.determineFormatType(format),
          description: this.buildFormatDescription(format)
        };
        
        formats.push(formatInfo);
      });
    }

    return this.sortFormats(formats);
  }

  // Enhanced text format parsing (fallback)
  parseFormatsFromText(output) {
    const formatLines = output
      .split("\n")
      .filter(line => line.match(/^\d+\s/) && !line.includes("[info]"));

    const formats = formatLines.map(line => {
      const parts = line.trim().split(/\s+/);
      const formatId = parts[0];
      
      const isAudioOnly = line.includes("audio only");
      const isVideoOnly = line.includes("video only");
      const resolution = line.match(/\d+x\d+/)?.[0] || (isAudioOnly ? "audio" : "unknown");
      const filesize = line.match(/(\d+(\.\d+)?)(K|M|G)iB/)?.[0] || "unknown";
      const codec = line.match(/(avc|mp4|vp9|opus|m4a|webm|h264)/gi)?.[0] || "unknown";

      let type = "video+audio";
      if (isAudioOnly) type = "audio";
      else if (isVideoOnly) type = "video";

      return {
        formatId,
        type,
        resolution,
        filesize,
        codec,
        description: line.trim(),
      };
    });

    return this.sortFormats(formats);
  }

  determineFormatType(format) {
    const hasVideo = format.vcodec && format.vcodec !== 'none';
    const hasAudio = format.acodec && format.acodec !== 'none';
    
    if (hasVideo && hasAudio) return 'video+audio';
    if (hasVideo) return 'video';
    if (hasAudio) return 'audio';
    return 'unknown';
  }

  buildFormatDescription(format) {
    const parts = [];
    
    if (format.format_id) parts.push(format.format_id);
    if (format.ext) parts.push(format.ext);
    if (format.resolution) parts.push(format.resolution);
    if (format.filesize || format.filesize_approx) {
      parts.push(this.formatFilesize(format.filesize || format.filesize_approx));
    }
    if (format.format_note) parts.push(format.format_note);
    
    return parts.join(' ');
  }

  formatFilesize(bytes) {
    if (!bytes || bytes === 0) return 'unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  sortFormats(formats) {
    return formats.sort((a, b) => {
      // Sort by type first (video+audio, video, audio, unknown)
      const typeOrder = { 'video+audio': 0, 'video': 1, 'audio': 2, 'unknown': 3 };
      const typeComparison = typeOrder[a.type] - typeOrder[b.type];
      
      if (typeComparison !== 0) return typeComparison;
      
      // Then by quality/resolution
      const aRes = this.parseResolution(a.resolution);
      const bRes = this.parseResolution(b.resolution);
      
      return bRes - aRes; // Higher resolution first
    });
  }

  parseResolution(resolution) {
    if (!resolution || resolution === 'unknown' || resolution === 'audio') return 0;
    
    const match = resolution.match(/(\d+)x(\d+)/);
    if (match) {
      return parseInt(match[2]); // Return height
    }
    
    // Handle common resolution strings
    const resolutions = {
      '2160p': 2160, '1440p': 1440, '1080p': 1080, 
      '720p': 720, '480p': 480, '360p': 360, '240p': 240
    };
    
    for (const [key, value] of Object.entries(resolutions)) {
      if (resolution.includes(key)) return value;
    }
    
    return 0;
  }

  isRetryableError(error) {
    const retryableErrors = [
      'network error', 'timeout', 'connection reset', 
      'temporary failure', 'service unavailable'
    ];
    
    return retryableErrors.some(retryableError => 
      error.toLowerCase().includes(retryableError)
    );
  }

  // Enhanced download with better progress tracking and error handling
  async download(url, options, callbacks) {
    if (this.isDownloading) {
      throw new DownloadError("A download is already in progress", "DOWNLOAD_IN_PROGRESS");
    }

    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      throw new DownloadError("Invalid URL", "INVALID_URL");
    }

    this.isDownloading = true;
    this.cancelRequested = false;

    try {
      const result = await this.executeDownload(url, options, callbacks);
      return result;
    } finally {
      this.isDownloading = false;
      this.currentProcess = null;
    }
  }

  async executeDownload(url, options, callbacks) {
    return new Promise(async (resolve, reject) => {
      const args = await this.buildArgs(url, options);
      console.log('Executing download with args:', args);

      this.currentProcess = spawn(this.ytdlpPath, args);

      let downloadState = {
        totalFragments: 0,
        currentFragment: 0,
        filename: "",
        destinationFile: "",
        speed: "",
        eta: "",
        percentage: 0
      };

      this.currentProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log('yt-dlp output:', output);

        this.parseDownloadProgress(output, downloadState);

        if (callbacks.onProgress) {
          callbacks.onProgress({
            percent: downloadState.percentage,
            output,
            currentFragment: downloadState.currentFragment,
            totalFragments: downloadState.totalFragments,
            filename: downloadState.filename,
            speed: downloadState.speed,
            eta: downloadState.eta
          });
        }
      });

      this.currentProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error('yt-dlp error:', error);
        
        // Don't treat warnings as errors
        if (!error.toLowerCase().includes('warning')) {
          if (callbacks.onError) {
            callbacks.onError(error);
          }
        }
      });

      this.currentProcess.on("close", async (code) => {
        this.currentProcess = null;

        if (this.cancelRequested) {
          reject(new DownloadError("Download was cancelled", "CANCELLED"));
          return;
        }

        if (code === 0) {
          try {
            // Get file stats if available
            let fileSize = null;
            if (downloadState.destinationFile && await this.fileExists(downloadState.destinationFile)) {
              const stats = await fs.stat(downloadState.destinationFile);
              fileSize = stats.size;
            }

            const result = {
              success: true,
              filename: downloadState.filename,
              path: downloadState.destinationFile,
              fileSize
            };

            resolve(result);

            if (callbacks.onComplete) {
              callbacks.onComplete(result);
            }
          } catch (error) {
            console.error('Error processing completed download:', error);
            resolve({
              success: true,
              filename: downloadState.filename,
              path: downloadState.destinationFile
            });
          }
        } else {
          reject(new DownloadError(
            `Download failed with exit code ${code}`, 
            "DOWNLOAD_FAILED", 
            { code }
          ));
        }
      });

      this.currentProcess.on("error", (error) => {
        reject(new DownloadError(
          `Process error: ${error.message}`, 
          "PROCESS_ERROR"
        ));
      });
    });
  }

  parseDownloadProgress(output, state) {
    // Extract filename/destination
    const filenameMatch = output.match(/\[download\]\s+Destination:\s+(.+)/);
    if (filenameMatch && filenameMatch[1]) {
      state.destinationFile = filenameMatch[1].trim();
      state.filename = path.basename(state.destinationFile);
    }

    // Extract merge output format filename
    const mergeMatch = output.match(/\[Merger\]\s+Merging formats into\s+"(.+)"/);
    if (mergeMatch && mergeMatch[1]) {
      state.destinationFile = mergeMatch[1].trim();
      state.filename = path.basename(state.destinationFile);
    }

    // Parse fragment information
    const fragMatch = output.match(/\(frag\s+(\d+)\/(\d+)\)/);
    if (fragMatch) {
      state.currentFragment = parseInt(fragMatch[1], 10);
      state.totalFragments = parseInt(fragMatch[2], 10);
    }

    // Parse download percentage
    const percentMatch = output.match(/([\d.]+)%/);
    if (percentMatch) {
      let percent = parseFloat(percentMatch[1]);
      
      // Calculate fragment-based progress if available
      if (state.totalFragments > 0) {
        const fragmentProgress = percent / 100;
        percent = ((state.currentFragment - 1 + fragmentProgress) / state.totalFragments) * 100;
      }
      
      state.percentage = Math.min(percent, 100);
    }

    // Parse download speed
    const speedMatch = output.match(/([\d.]+)(K|M|G)?iB\/s/);
    if (speedMatch) {
      state.speed = speedMatch[0];
    }

    // Parse ETA
    const etaMatch = output.match(/ETA\s+([\d:]+)/);
    if (etaMatch) {
      state.eta = etaMatch[1];
    }
  }

  // Enhanced argument building with better format handling
  async buildArgs(url, options) {
    const args = [];

    // Output template with sanitization
    const outputTemplate = options.outputTemplate || "%(title)s.%(ext)s";
    const sanitizedTemplate = outputTemplate.replace(/[<>:"|?*]/g, '_');
    args.push("-o", path.join(this.outputPath, sanitizedTemplate));

    // Format selection with improved logic
    if (options.format) {
      args.push("-f", options.format);
    } else if (options.type === "audio") {
      args.push("-x"); // Extract audio
      if (options.audioFormat && options.audioFormat !== 'best') {
        args.push("--audio-format", options.audioFormat);
      }
      if (options.audioQuality && options.audioQuality !== 'best') {
        args.push("--audio-quality", options.audioQuality);
      }
    } else if (options.type === "video") {
      const formatString = this.buildVideoFormatString(options.videoQuality);
      if (formatString) {
        args.push("-f", formatString);
      }
    }

    // Merge format (important for avoiding format issues)
    if (options.mergeFormat) {
      args.push("--merge-output-format", options.mergeFormat);
    } else if (options.type === "video") {
      // Default to mp4 for better compatibility
      args.push("--merge-output-format", "mp4");
    }

    // Subtitle handling
    this.addSubtitleArgs(args, options);

    // Metadata and thumbnail options
    if (options.embedMetadata) {
      args.push("--embed-metadata");
    }

    if (options.embedThumbnail) {
      args.push("--embed-thumbnail");
    }

    // Playlist handling
    if (options.playlist) {
      if (options.playlistItems) {
        args.push("--playlist-items", options.playlistItems);
      }
      if (options.playlistStart) {
        args.push("--playlist-start", options.playlistStart.toString());
      }
      if (options.playlistEnd) {
        args.push("--playlist-end", options.playlistEnd.toString());
      }
    } else {
      args.push("--no-playlist");
    }

    // Advanced options
    if (options.cookiesFile && await this.fileExists(options.cookiesFile)) {
      args.push("--cookies", options.cookiesFile);
    }

    if (options.proxy) {
      args.push("--proxy", options.proxy);
    }

    if (options.downloadArchive) {
      args.push("--download-archive", options.downloadArchive);
    }

    if (options.maxFilesize) {
      args.push("--max-filesize", options.maxFilesize);
    }

    if (options.minFilesize) {
      args.push("--min-filesize", options.minFilesize);
    }

    // Rate limiting
    if (options.limitRate) {
      args.push("--limit-rate", options.limitRate);
    }

    // Retry options
    args.push("--retries", "3");
    args.push("--fragment-retries", "3");

    // Better error handling
    args.push("--abort-on-unavailable-fragment");
    args.push("--no-continue"); // Avoid partial file issues

    // Add URL at the end
    args.push(url);

    return args;
  }

  buildVideoFormatString(quality) {
    const qualityMap = {
      "best": "bestvideo+bestaudio/best",
      "2160p": "bestvideo[height<=2160]+bestaudio/best[height<=2160]",
      "1440p": "bestvideo[height<=1440]+bestaudio/best[height<=1440]", 
      "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
      "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
      "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
      "360p": "bestvideo[height<=360]+bestaudio/best[height<=360]",
      "worst": "worstvideo+worstaudio/worst"
    };

    return qualityMap[quality] || qualityMap["best"];
  }

  addSubtitleArgs(args, options) {
    if (!options.subtitles) return;

    if (options.subtitles === "all") {
      args.push("--all-subs");
    } else if (options.subtitles === "auto") {
      args.push("--write-auto-sub");
    } else if (Array.isArray(options.subtitles)) {
      args.push("--sub-langs", options.subtitles.join(","));
    } else {
      args.push("--sub-langs", options.subtitles);
    }

    if (options.embedSubs) {
      args.push("--embed-subs");
    } else {
      args.push("--write-sub");
    }

    if (options.subFormat) {
      args.push("--sub-format", options.subFormat);
    }
  }

  // Enhanced cancellation
  cancel() {
    this.cancelRequested = true;
    if (this.currentProcess && !this.currentProcess.killed) {
      try {
        // Try graceful termination first
        this.currentProcess.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          if (this.currentProcess && !this.currentProcess.killed) {
            this.currentProcess.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        console.error('Error cancelling download:', error);
      }
    }
  }

  // Enhanced path management
  async setOutputPath(newPath) {
    try {
      // Validate path
      await fs.access(newPath, fsSync.constants.W_OK);
      
      this.outputPath = newPath;
      this.store.set("outputPath", newPath);
      
      await this.ensureDirectory(newPath);
      return { success: true, path: newPath };
    } catch (error) {
      throw new DownloadError(
        `Cannot set output path: ${error.message}`, 
        "INVALID_PATH"
      );
    }
  }

  // Enhanced profile management
  getProfiles() {
    try {
      const profiles = this.store.get("profiles", []);
      return profiles.filter(profile => profile && profile.name && profile.options);
    } catch (error) {
      console.error('Error getting profiles:', error);
      return [];
    }
  }

  async saveProfile(name, options) {
    try {
      if (!name || !options) {
        throw new Error("Profile name and options are required");
      }

      const profiles = this.getProfiles();
      const existingIndex = profiles.findIndex(p => p.name === name);

      const profileData = {
        name: name.trim(),
        options: { ...options },
        created: existingIndex >= 0 ? profiles[existingIndex].created : new Date().toISOString(),
        modified: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        profiles[existingIndex] = profileData;
      } else {
        profiles.push(profileData);
      }

      this.store.set("profiles", profiles);
      return profiles;
    } catch (error) {
      throw new DownloadError(`Failed to save profile: ${error.message}`, "PROFILE_SAVE_FAILED");
    }
  }

  async deleteProfile(name) {
    try {
      const profiles = this.getProfiles();
      const filteredProfiles = profiles.filter(p => p.name !== name);
      
      if (filteredProfiles.length === profiles.length) {
        throw new Error("Profile not found");
      }
      
      this.store.set("profiles", filteredProfiles);
      return filteredProfiles;
    } catch (error) {
      throw new DownloadError(`Failed to delete profile: ${error.message}`, "PROFILE_DELETE_FAILED");
    }
  }

  // Utility methods
  async getVideoInfo(url) {
    try {
      const validation = this.validateUrl(url);
      if (!validation.isValid) {
        throw new DownloadError("Invalid URL", "INVALID_URL");
      }

      return new Promise((resolve, reject) => {
        const args = ["-j", "--no-playlist", url];
        const process = spawn(this.ytdlpPath, args);

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("close", (code) => {
          if (code === 0) {
            try {
              const info = JSON.parse(stdout);
              resolve({
                title: info.title,
                duration: info.duration,
                uploader: info.uploader,
                description: info.description,
                thumbnail: info.thumbnail,
                viewCount: info.view_count,
                uploadDate: info.upload_date
              });
            } catch {
              reject(new DownloadError("Failed to parse video info", "INFO_PARSE_FAILED"));
            }
          } else {
            reject(new DownloadError(stderr || "Failed to get video info", "INFO_FETCH_FAILED"));
          }
        });
      });
    } catch (error) {
      throw new DownloadError(`Failed to get video info: ${error.message}`, "INFO_ERROR");
    }
  }
}

module.exports = Downloader;