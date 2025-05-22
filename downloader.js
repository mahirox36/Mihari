const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { app } = require("electron");
const Store = require("electron-store");
const store = new Store();

class Downloader {
  constructor() {
    // In production, yt-dlp.exe is in resources directory, in dev it's in the root
    const isProduction =
      !process.env.NODE_ENV || process.env.NODE_ENV === "production";
    this.ytdlpPath = isProduction
      ? fs.existsSync(path.join(process.resourcesPath, "yt-dlp.exe"))
        ? path.join(process.resourcesPath, "yt-dlp.exe")
        : path.join(process.cwd(), "yt-dlp.exe")
      : path.join(process.cwd(), "yt-dlp.exe");

    this.defaultOutputPath = path.join(os.homedir(), "Videos", "Mahiri");
    this.currentProcess = null;
    this.cancelRequested = false;

    // Create default output directory if it doesn't exist
    if (!fs.existsSync(this.defaultOutputPath)) {
      fs.mkdirSync(this.defaultOutputPath, { recursive: true });
    }

    // Load saved output path or use default
    this.outputPath = store.get("outputPath", this.defaultOutputPath);
  }

  // Validate URL using regex
  validateUrl(url) {
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    return urlRegex.test(url);
  }

  // Get available formats for a URL
  async getFormats(url) {
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
          const formats = this.parseFormats(stdout);
          resolve(formats);
        } else {
          reject(stderr || "Failed to get formats");
        }
      });
    });
  }

  // Parse formats from yt-dlp output
  parseFormats(output) {
    const formatLines = output
      .split("\n")
      .filter(
        (line) =>
          line.match(/^\d+\s/) ||
          line.includes("audio only") ||
          line.includes("video only")
      );

    return formatLines.map((line) => {
      const formatId = line.match(/^(\d+)\s/)?.[1] || "";
      const isAudioOnly = line.includes("audio only");
      const isVideoOnly = line.includes("video only");
      const resolution = line.match(/\d+x\d+/)?.[0] || "";
      const filesize = line.match(/(\d+(\.\d+)?)(K|M|G)iB/)?.[0] || "";
      const codec = line.match(/(avc|mp4|vp9|opus|m4a|webm)/gi)?.[0] || "";

      let type = "unknown";
      if (isAudioOnly) type = "audio";
      else if (isVideoOnly) type = "video";
      else if (line.includes("mp4") || line.includes("webm"))
        type = "video+audio";

      return {
        formatId,
        type,
        resolution,
        filesize,
        codec,
        description: line.trim(),
      };
    });
  }

  // Download with options
  download(url, options, callbacks) {
    return new Promise((resolve, reject) => {
      if (this.currentProcess) {
        reject("A download is already in progress");
        return;
      }

      if (!this.validateUrl(url)) {
        reject("Invalid URL");
        return;
      }

      // Reset cancellation flag
      this.cancelRequested = false;

      // Build arguments based on options
      const args = this.buildArgs(url, options);

      // Spawn yt-dlp process
      this.currentProcess = spawn(this.ytdlpPath, args);

      let totalFragments = 0;
      let currentFragment = 0;
      let filename = "";
      let destinationFile = "";

      this.currentProcess.stdout.on("data", (data) => {
        const output = data.toString();

        // Try to extract filename
        const filenameMatch = output.match(
          /\[download\]\s+Destination:\s+(.+)/
        );
        if (filenameMatch && filenameMatch[1]) {
          destinationFile = filenameMatch[1];
          filename = path.basename(destinationFile);
        }

        // Parse fragment information
        const fragMatch = output.match(/\(frag\s+(\d+)\/(\d+)\)/);
        if (fragMatch) {
          currentFragment = parseInt(fragMatch[1], 10);
          totalFragments = parseInt(fragMatch[2], 10);
        }

        // Parse download percentage
        const percentMatch = output.match(/([\d.]+)%/);
        let percent = percentMatch ? parseFloat(percentMatch[1]) : 0;

        // If we have fragments, calculate the true progress
        if (totalFragments > 0) {
          const fragmentProgress = percent / 100;
          percent =
            ((currentFragment - 1 + fragmentProgress) / totalFragments) * 100;
        }

        // Call progress callback
        if (callbacks.onProgress) {
          callbacks.onProgress({
            percent,
            output,
            currentFragment,
            totalFragments,
            filename,
          });
        }
      });

      this.currentProcess.stderr.on("data", (data) => {
        const error = data.toString();
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      });

      this.currentProcess.on("close", (code) => {
        this.currentProcess = null;

        if (this.cancelRequested) {
          reject("Download was cancelled");
          return;
        }

        if (code === 0) {
          resolve({
            success: true,
            filename,
            path: destinationFile,
          });

          // Call completion callback
          if (callbacks.onComplete) {
            callbacks.onComplete({
              filename,
              path: destinationFile,
            });
          }
        } else {
          reject(`Process exited with code ${code}`);
        }
      });
    });
  }

  // Build command-line arguments
  buildArgs(url, options) {
    const args = [];

    // Output template
    const outputTemplate = options.outputTemplate || "%(title)s.%(ext)s";
    args.push("-o", path.join(this.outputPath, outputTemplate));

    // Format selection
    if (options.format) {
      args.push("-f", options.format);
    } else if (options.type === "audio") {
      args.push("-x");
      if (options.audioFormat) {
        args.push("--audio-format", options.audioFormat);
      }
      if (options.audioQuality) {
        args.push("--audio-quality", options.audioQuality);
      }
    } else if (options.type === "video") {
      // Handle video quality
      if (options.videoQuality) {
        switch (options.videoQuality) {
          case "best":
            args.push("-f", "bestvideo+bestaudio");
            break;
          case "1080p":
            args.push(
              "-f",
              "bestvideo[height<=1080]+bestaudio/best[height<=1080]"
            );
            break;
          case "720p":
            args.push(
              "-f",
              "bestvideo[height<=720]+bestaudio/best[height<=720]"
            );
            break;
          case "480p":
            args.push(
              "-f",
              "bestvideo[height<=480]+bestaudio/best[height<=480]"
            );
            break;
          case "worst":
            args.push("-f", "worst");
            break;
        }
      }
    }

    // Handle merge format
    if (options.mergeFormat) {
      args.push("--merge-output-format", options.mergeFormat);
    }

    // Handle subtitles
    if (options.subtitles) {
      if (options.subtitles === "all") {
        args.push("--all-subs");
      } else if (options.subtitles === "auto") {
        args.push("--write-auto-sub");
      } else {
        args.push("--sub-lang", options.subtitles);
      }

      if (options.embedSubs) {
        args.push("--embed-subs");
      }
    }

    // Metadata
    if (options.embedMetadata) {
      args.push("--embed-metadata");
    }

    // Thumbnails
    if (options.embedThumbnail) {
      args.push("--embed-thumbnail");
    }

    // Playlist options
    if (options.playlist) {
      if (options.playlistItems) {
        args.push("--playlist-items", options.playlistItems);
      }
    } else {
      args.push("--no-playlist");
    }

    // Cookies
    if (options.cookiesFile) {
      args.push("--cookies", options.cookiesFile);
    }

    // Proxy
    if (options.proxy) {
      args.push("--proxy", options.proxy);
    }

    // Download archive
    if (options.downloadArchive) {
      args.push("--download-archive", options.downloadArchive);
    }

    // Add URL at the end
    args.push(url);

    return args;
  }

  // Cancel current download
  cancel() {
    if (this.currentProcess) {
      this.cancelRequested = true;
      this.currentProcess.kill();
    }
  }

  // Set output path
  setOutputPath(path) {
    this.outputPath = path;
    store.set("outputPath", path);

    // Create directory if it doesn't exist
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  // Get saved profiles
  getProfiles() {
    return store.get("profiles", []);
  }

  // Save a profile
  saveProfile(name, options) {
    const profiles = this.getProfiles();
    const existingIndex = profiles.findIndex((p) => p.name === name);

    if (existingIndex >= 0) {
      profiles[existingIndex] = { name, options };
    } else {
      profiles.push({ name, options });
    }

    store.set("profiles", profiles);
    return profiles;
  }

  // Delete a profile
  deleteProfile(name) {
    const profiles = this.getProfiles();
    const filteredProfiles = profiles.filter((p) => p.name !== name);
    store.set("profiles", filteredProfiles);
    return filteredProfiles;
  }
}

module.exports = Downloader;
