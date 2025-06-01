const {
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const Store = require("electron-store");
const { version } = require("./package.json");
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const Downloader = require('./downloader');

// Constants
const MAX_HISTORY_ITEMS = 1000;
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'];
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.opus', '.ogg', '.wav', '.flac'];

// Initialize data storage with validation
const store = new Store({
  schema: {
    downloadHistory: {
      type: 'array',
      default: []
    },
    outputPath: {
      type: 'string',
      default: path.join(os.homedir(), "Videos", "Mihari")
    }
  }
});

// Load and validate download history
let downloadHistory = [];

class HistoryManager {
  static async loadHistory() {
    try {
      downloadHistory = store.get("downloadHistory", []);
      // Validate and clean history
      downloadHistory = downloadHistory.filter(item => 
        item && typeof item === 'object' && item.url && item.date
      );
      
      // Limit history size
      if (downloadHistory.length > MAX_HISTORY_ITEMS) {
        downloadHistory = downloadHistory.slice(0, MAX_HISTORY_ITEMS);
        store.set("downloadHistory", downloadHistory);
      }
      
      return downloadHistory;
    } catch (error) {
      console.error('Failed to load history:', error);
      downloadHistory = [];
      return [];
    }
  }

  static async addToHistory(item) {
    try {
      const historyItem = {
        id: Date.now().toString(),
        url: item.url,
        type: item.type || "video",
        quality: item.quality || "default",
        format: item.format || "default",
        date: new Date().toISOString(),
        filename: item.filename,
        filePath: item.filePath,
        originalFilePath: item.filePath, // Keep original path for reference
        fileSize: item.fileSize || null,
        duration: item.duration || null
      };

      downloadHistory.unshift(historyItem);
      
      // Keep only recent items
      if (downloadHistory.length > MAX_HISTORY_ITEMS) {
        downloadHistory = downloadHistory.slice(0, MAX_HISTORY_ITEMS);
      }
      
      await store.set("downloadHistory", downloadHistory);
      return historyItem;
    } catch (error) {
      console.error('Failed to add to history:', error);
      throw error;
    }
  }

  static async clearHistory() {
    try {
      downloadHistory = [];
      await store.set("downloadHistory", []);
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      return false;
    }
  }
}

class FileManager {
  static async findActualFile(originalPath) {
    if (!originalPath) return null;
    
    try {
      // Check if original file exists
      if (await this.fileExists(originalPath)) {
        return originalPath;
      }

      const dir = path.dirname(originalPath);
      const baseName = path.basename(originalPath, path.extname(originalPath));
      
      // Try common extensions for the same base filename
      const extensionsToTry = [
        ...SUPPORTED_VIDEO_EXTENSIONS,
        ...SUPPORTED_AUDIO_EXTENSIONS
      ];

      for (const ext of extensionsToTry) {
        const testPath = path.join(dir, baseName + ext);
        if (await this.fileExists(testPath)) {
          return testPath;
        }
      }

      // Try to find similar files in the same directory
      const files = await fs.readdir(dir).catch(() => []);
      const similarFile = files.find(file => 
        file.toLowerCase().includes(baseName.toLowerCase().substring(0, 20))
      );

      if (similarFile) {
        return path.join(dir, similarFile);
      }

      return null;
    } catch (error) {
      console.error('Error finding file:', error);
      return null;
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async openFile(filePath) {
    try {
      const actualPath = await this.findActualFile(filePath);
      if (!actualPath) {
        throw new Error('File not found');
      }

      const result = await shell.openPath(actualPath);
      if (result) {
        throw new Error(`Failed to open file: ${result}`);
      }
      
      return { success: true, actualPath };
    } catch (error) {
      console.error('Failed to open file:', error);
      return { success: false, error: error.message };
    }
  }

  static async showInFolder(filePath) {
    try {
      const actualPath = await this.findActualFile(filePath);
      if (!actualPath) {
        // If file not found, try to open the directory
        const dir = path.dirname(filePath);
        if (await this.fileExists(dir)) {
          await shell.openPath(dir);
          return { success: true, openedDirectory: true };
        }
        throw new Error('File and directory not found');
      }

      shell.showItemInFolder(actualPath);
      return { success: true, actualPath };
    } catch (error) {
      console.error('Failed to show in folder:', error);
      return { success: false, error: error.message };
    }
  }
}

class WindowManager {
  static createWindow() {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 850,
      minWidth: 900,
      minHeight: 700,
      frame: true,
      title: "Mihari - Ultimate Video Downloader",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      icon: path.join(__dirname, "assets", "icon.png"),
      show: false, // Don't show until ready
      titleBarStyle: 'default'
    });

    // Show window when ready to prevent flash
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow.webContents.send("app-version", version);
    });

    // Load history when window is ready
    HistoryManager.loadHistory();

    // Load the downloading page first
    mainWindow.loadFile(path.join(__dirname, "renderer", "downloading.html"));

    mainWindow.setMenuBarVisibility(false);
    
    return mainWindow;
  }
}

let mainWindow;
let downloader; // Move downloader declaration here, instantiate after binaries are ready

// --- BEGIN: Binary path resolution for asar/unpacked ---
function getUnpackedPath(filename) {
  // If running from inside app.asar, use app.asar.unpacked for binaries
  let basePath = __dirname;
  if (app && app.isPackaged && basePath.includes('app.asar')) {
    basePath = basePath.replace('app.asar', 'app.asar.unpacked');
  }
  return path.join(basePath, filename);
}
// --- END: Binary path resolution for asar/unpacked ---

// --- BEGIN: Auto-download dependencies ---
const BINARIES = [
  {
    name: 'yt-dlp',
    displayName: 'YouTube Downloader',
    filename: process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
    url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    local: getUnpackedPath(process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
  },
  {
    name: 'ffmpeg',
    displayName: 'Media Processor',
    filename: 'ffmpeg.exe',
    url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    local: getUnpackedPath('ffmpeg.exe'),
    isZip: true,
    zipEntry: /ffmpeg.exe$/i,
  },
  {
    name: 'ffprobe',
    displayName: 'Media Analyzer',
    filename: 'ffprobe.exe',
    url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    local: getUnpackedPath('ffprobe.exe'),
    isZip: true,
    zipEntry: /ffprobe.exe$/i,
  },
];

// Enhanced download function with better progress tracking
async function downloadFile(url, dest, onProgress, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const doRequest = (currentUrl, redirectsLeft) => {
      const request = https.get(currentUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          const nextUrl = res.headers.location.startsWith('http') 
            ? res.headers.location 
            : new URL(res.headers.location, currentUrl).toString();
          doRequest(nextUrl, redirectsLeft - 1);
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: Failed to download from ${currentUrl}`));
          return;
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        let lastReported = 0;
        
        const file = fsSync.createWriteStream(dest);
        
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          // Report progress every 100KB or when complete to avoid flooding
          if (onProgress && total && (downloaded - lastReported > 100000 || downloaded === total)) {
            onProgress(downloaded, total);
            lastReported = downloaded;
          }
        });
        
        res.pipe(file);
        
        file.on('finish', () => {
          file.close(() => {
            console.log(`[Download] Completed: ${dest} (${downloaded} bytes)`);
            resolve();
          });
        });
        
        file.on('error', (err) => {
          console.error(`[Download] File error: ${err.message}`);
          fsSync.unlink(dest, () => {}); // Clean up partial file
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        console.error(`[Download] Request error: ${err.message}`);
        reject(err);
      });
      
      // Set timeout for the request
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    };
    
    doRequest(url, maxRedirects);
  });
}

async function extractFromZip(zipPath, match, dest) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntries().find(e => match.test(e.entryName));
    
    if (!entry) {
      throw new Error(`Entry not found in zip archive: ${match}`);
    }
    
    await fs.writeFile(dest, entry.getData());
    console.log(`[Extract] Successfully extracted: ${dest}`);
  } catch (error) {
    console.error(`[Extract] Failed to extract ${dest}: ${error.message}`);
    throw error;
  }
}

async function ensureBinaries(mainWindow) {
  console.log('[Dependencies] Checking required binaries...');
  
  let needsDownload = false;
  const missingBinaries = [];
  
  for (const bin of BINARIES) {
    if (!fsSync.existsSync(bin.local)) {
      needsDownload = true;
      missingBinaries.push(bin.displayName);
    }
  }
  
  if (!needsDownload) {
    console.log('[Dependencies] All binaries present');
    return;
  }

  console.log(`[Dependencies] Missing binaries: ${missingBinaries.join(', ')}`);
  
  if (mainWindow) {
    mainWindow.webContents.send('dependency-download-status', { 
      status: 'starting',
      message: 'Initializing system components...'
    });
  }

  for (const bin of BINARIES) {
    if (fsSync.existsSync(bin.local)) {
      console.log(`[Dependencies] ${bin.displayName} already exists`);
      continue;
    }
    
    console.log(`[Dependencies] Downloading ${bin.displayName}...`);
    
    if (mainWindow) {
      mainWindow.webContents.send('dependency-download-status', { 
        status: 'downloading', 
        name: bin.name,
        displayName: bin.displayName,
        message: `Downloading ${bin.displayName}...`
      });
    }
    
    try {
      if (!bin.isZip) {
        // Direct binary download
        await downloadFile(bin.url, bin.local, (done, total) => {
          if (mainWindow) {
            mainWindow.webContents.send('dependency-download-progress', { 
              name: bin.name, 
              done, 
              total,
              percent: Math.floor((done / total) * 100)
            });
          }
        });
        
        // Make executable on Unix systems
        if (process.platform !== 'win32') {
          fsSync.chmodSync(bin.local, 0o755);
        }
      } else {
        // Download and extract from zip
        const tmpZip = path.join(os.tmpdir(), `mihari_${bin.name}_${Date.now()}.zip`);
        
        await downloadFile(bin.url, tmpZip, (done, total) => {
          if (mainWindow) {
            mainWindow.webContents.send('dependency-download-progress', { 
              name: bin.name, 
              done, 
              total,
              percent: Math.floor((done / total) * 100)
            });
          }
        });
        
        // Extract the specific file from zip
        await extractFromZip(tmpZip, bin.zipEntry, bin.local);
        
        // Clean up temporary zip file
        try {
          fsSync.unlinkSync(tmpZip);
        } catch (e) {
          console.warn(`[Cleanup] Failed to remove temp file: ${tmpZip}`);
        }
      }
      
      console.log(`[Dependencies] ${bin.displayName} downloaded successfully`);
      
      if (mainWindow) {
        mainWindow.webContents.send('dependency-download-status', { 
          status: 'downloaded', 
          name: bin.name,
          displayName: bin.displayName,
          message: `${bin.displayName} installation complete`
        });
      }
      
      // Small delay to show completion status
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[Dependencies] Failed to download ${bin.displayName}: ${error.message}`);
      
      if (mainWindow) {
        mainWindow.webContents.send('dependency-download-status', { 
          status: 'error', 
          name: bin.name,
          displayName: bin.displayName,
          error: error.message,
          message: `Failed to download ${bin.displayName}`
        });
      }
      
      throw error;
    }
  }
  
  console.log('[Dependencies] All binaries downloaded successfully');
  
  if (mainWindow) {
    mainWindow.webContents.send('dependency-download-status', { 
      status: 'done',
      message: 'All components ready! Launching Mihari...'
    });
  }
}
// --- END: Auto-download dependencies ---

// --- BEGIN: Auto-update logic ---
const AUTO_UPDATE = {
  FORCE: false, // Set to true to force auto-update for testing
  BASE_URL: 'https://github.com/mahirox36/Mihari',
  INSTALLER_NAME: 'Mihari-Setup.exe',
  USER_AGENT: 'Mihari-Updater',
  CHECK_INTERVAL: 1000 * 60 * 60, // Check every hour
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 * 5, // 5 seconds
};

AUTO_UPDATE.VERSION_URL = `${AUTO_UPDATE.BASE_URL}/releases/latest`;
AUTO_UPDATE.DOWNLOAD_URL = `${AUTO_UPDATE.VERSION_URL}/download/${AUTO_UPDATE.INSTALLER_NAME}`;
AUTO_UPDATE.API_URL = 'https://api.github.com/repos/mahirox36/Mihari/releases/latest';
AUTO_UPDATE.INSTALLER_PATH = path.join(os.tmpdir(), AUTO_UPDATE.INSTALLER_NAME);

// Version comparison helper
function compareVersions(v1, v2) {
  const normalize = v => v.split('.').map(Number);
  const [a1, a2, a3 = 0] = normalize(v1);
  const [b1, b2, b3 = 0] = normalize(v2);
  
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

async function checkForUpdate(retry = 0) {
  const options = {
    headers: { 'User-Agent': AUTO_UPDATE.USER_AGENT },
    timeout: 10000 // 10 second timeout
  };

  try {
    console.log('[AutoUpdate] Checking for updates...');
    const res = await fetch(AUTO_UPDATE.API_URL, options);
    
    if (!res.ok) {
      throw new Error(`GitHub API responded with ${res.status}: ${res.statusText}`);
    }
    
    const release = await res.json();
    const latestVersion = release.tag_name?.replace(/^v/, '') || null;
    
    console.log(`[AutoUpdate] Latest version: ${latestVersion}`);
    return latestVersion;
  } catch (error) {
    console.error(`[AutoUpdate] Update check failed (attempt ${retry + 1}): ${error.message}`);
    
    if (retry < AUTO_UPDATE.MAX_RETRIES) {
      console.log(`[AutoUpdate] Retrying in ${AUTO_UPDATE.RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE.RETRY_DELAY));
      return checkForUpdate(retry + 1);
    }
    
    throw error;
  }
}

async function downloadLatestInstaller(onProgress, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    function doRequest(currentUrl, redirectsLeft) {
      console.log('[AutoUpdate] Downloading installer from:', currentUrl);
      
      const request = https.get(currentUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          const nextUrl = res.headers.location.startsWith('http') 
            ? res.headers.location 
            : new URL(res.headers.location, currentUrl).toString();
          console.log('[AutoUpdate] Redirecting to:', nextUrl);
          doRequest(nextUrl, redirectsLeft - 1);
          return;
        }
        
        if (res.statusCode !== 200) {
          const error = `Failed to download installer (HTTP ${res.statusCode})`;
          console.error('[AutoUpdate]', error);
          reject(new Error(error));
          return;
        }
        
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        let lastReported = 0;
        
        const file = fsSync.createWriteStream(AUTO_UPDATE.INSTALLER_PATH);
        
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          // Report progress every 100KB to avoid flooding
          if (onProgress && total && (downloaded - lastReported > 100000 || downloaded === total)) {
            onProgress(downloaded, total);
            lastReported = downloaded;
          }
        });
        
        res.pipe(file);
        
        file.on('finish', () => {
          console.log('[AutoUpdate] Installer download complete:', AUTO_UPDATE.INSTALLER_PATH);
          file.close(() => resolve(AUTO_UPDATE.INSTALLER_PATH));
        });
        
        file.on('error', (err) => {
          console.error('[AutoUpdate] File stream error:', err.message);
          fsSync.unlink(AUTO_UPDATE.INSTALLER_PATH, () => {}); // Clean up
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        console.error('[AutoUpdate] HTTPS request error:', err.message);
        reject(err);
      });
      
      request.setTimeout(60000, () => { // 60 second timeout for installer download
        request.destroy();
        reject(new Error('Installer download timeout'));
      });
    }
    
    doRequest(AUTO_UPDATE.DOWNLOAD_URL, maxRedirects);
  });
}

async function autoUpdate(mainWindow, quitAfter = false) {
  try {
    console.log('[AutoUpdate] Starting update check...');
    
    const latestVersion = await checkForUpdate();
    if (!latestVersion) {
      console.log('[AutoUpdate] No version information available');
      return false;
    }

    const shouldUpdate = AUTO_UPDATE.FORCE || compareVersions(latestVersion, version) > 0;
    if (!shouldUpdate) {
      console.log('[AutoUpdate] Already on latest version:', version);
      return false;
    }

    console.log(`[AutoUpdate] Update available: ${version} -> ${latestVersion}`);
    
    if (mainWindow) {
      mainWindow.webContents.send('dependency-download-status', { 
        status: 'updating', 
        name: 'auto-update',
        displayName: 'System Updates',
        currentVersion: version,
        latestVersion,
        forced: AUTO_UPDATE.FORCE,
        message: `Installing update ${latestVersion}...`
      });
    }

    await downloadLatestInstaller((done, total) => {
      if (mainWindow) {
        mainWindow.webContents.send('dependency-download-progress', { 
          name: 'auto-update', 
          done, 
          total,
          percent: Math.floor((done / total) * 100)
        });
      }
    });

    console.log('[AutoUpdate] Update downloaded, preparing to install');
    
    if (mainWindow) {
      mainWindow.webContents.send('dependency-download-status', { 
        status: 'update-downloaded', 
        name: 'auto-update',
        displayName: 'System Updates',
        installer: AUTO_UPDATE.INSTALLER_PATH,
        message: 'Update downloaded! Restarting application...'
      });
    }

    // Wait a moment to show the success message
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (AUTO_UPDATE.FORCE || quitAfter) {
      console.log('[AutoUpdate] Launching installer and quitting...');
      await shell.openPath(AUTO_UPDATE.INSTALLER_PATH);
      setTimeout(() => { app.quit(); }, 1000);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('[AutoUpdate] Update failed:', error.message);
    
    if (mainWindow) {
      mainWindow.webContents.send('dependency-download-status', { 
        status: 'error', 
        name: 'auto-update',
        displayName: 'System Updates',
        error: error.message,
        message: 'Update check failed'
      });
    }
    
    return false;
  }
}

// Set up periodic update checks
let updateCheckInterval;

function startUpdateChecks(mainWindow) {
  // Initial check after a short delay
  setTimeout(() => {
    autoUpdate(mainWindow).catch(error => {
      console.error('[AutoUpdate] Background update check failed:', error.message);
    });
  }, 10000);
  
  // Then check periodically
  updateCheckInterval = setInterval(() => {
    autoUpdate(mainWindow).catch(error => {
      console.error('[AutoUpdate] Periodic update check failed:', error.message);
    });
  }, AUTO_UPDATE.CHECK_INTERVAL);
}

function stopUpdateChecks() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
    console.log('[AutoUpdate] Stopped periodic update checks');
  }
}

// --- END: Auto-update logic ---

// Application lifecycle events
app.whenReady().then(async () => {
  console.log('[App] Application ready, creating main window...');
  
  let win = WindowManager.createWindow();
  let updateInProgress = false;
  
  try {
    // Check for forced updates first
    if (AUTO_UPDATE.FORCE) {
      console.log('[App] Forced update mode enabled');
      updateInProgress = await autoUpdate(win, true);
    }
    
    if (!updateInProgress) {
      // Download required binaries
      await ensureBinaries(win);
      
      // Initialize downloader and load main interface
      downloader = new Downloader();
      win.loadFile(path.join(__dirname, "renderer", "index.html"));
      
      // Start periodic update checks
      startUpdateChecks(win);
      
      console.log('[App] Application initialized successfully');
    }
  } catch (error) {
    console.error('[App] Initialization failed:', error.message);
    
    if (win) {
      win.webContents.send('dependency-download-status', { 
        status: 'fatal', 
        error: error.message,
        message: 'Application initialization failed'
      });
    }
  }
  
  mainWindow = win;
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = WindowManager.createWindow();
  }
});

// Attach to app lifecycle
app.on('before-quit', () => {
  stopUpdateChecks();
  // Cancel any ongoing downloads
  try {
    downloader.cancel();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
});

// Enhanced IPC handlers with proper error handling
ipcMain.handle("get-clipboard-text", async () => {
  try {
    const text = clipboard.readText();
    return { success: true, text };
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("validate-url", async (event, url) => {
  try {
    const isValid = await downloader.validateUrl(url);
    return { success: true, isValid };
  } catch (error) {
    console.error('URL validation failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-formats", async (event, url) => {
  try {
    const formats = await downloader.getFormats(url);
    return { success: true, formats };
  } catch (error) {
    console.error('Failed to get formats:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced download handling with better progress tracking
ipcMain.on("start-download", async (event, options) => {
  try {
    const result = await downloader.download(options.url, options, {
      onProgress: (progress) => {
        event.reply("download-progress", {
          ...progress,
          timestamp: Date.now()
        });
      },
      onError: (error) => {
        console.error('Download error:', error);
        event.reply("download-error", {
          error: error.toString(),
          timestamp: Date.now()
        });
      },
      onComplete: async (result) => {
        try {
          // Enhanced history item with more details
          const historyItem = await HistoryManager.addToHistory({
            url: options.url,
            type: options.type || "video",
            quality: options.videoQuality || options.audioQuality || "default",
            format: options.format || "default",
            filename: result.filename,
            filePath: result.path,
            fileSize: result.fileSize
          });

          event.reply("download-complete", {
            message: "Download completed successfully.",
            historyItem,
            timestamp: Date.now()
          });
        } catch (historyError) {
          console.error('Failed to add to history:', historyError);
          // Still report download success even if history fails
          event.reply("download-complete", {
            message: "Download completed successfully (history update failed).",
            timestamp: Date.now()
          });
        }
      },
    });
  } catch (error) {
    console.error('Download failed:', error);
    event.reply("download-error", {
      error: error.toString(),
      timestamp: Date.now()
    });
  }
});

ipcMain.on("cancel-download", () => {
  try {
    downloader.cancel();
  } catch (error) {
    console.error('Failed to cancel download:', error);
  }
});

// Enhanced path selection with validation
ipcMain.handle("select-output-path", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Download Location",
      buttonLabel: "Select Folder"
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      
      // Validate path is writable
      try {
        await fs.access(selectedPath, fsSync.constants.W_OK);
        downloader.setOutputPath(selectedPath);
        return { success: true, path: selectedPath };
      } catch (accessError) {
        return { 
          success: false, 
          error: "Selected folder is not writable. Please choose another location." 
        };
      }
    }

    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Path selection failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-output-path", () => {
  try {
    return { success: true, path: downloader.outputPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Profile management with enhanced error handling
ipcMain.handle("get-profiles", () => {
  try {
    const profiles = downloader.getProfiles();
    return { success: true, profiles };
  } catch (error) {
    console.error('Failed to get profiles:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-profile", async (event, name, options) => {
  try {
    const profiles = await downloader.saveProfile(name, options);
    return { success: true, profiles };
  } catch (error) {
    console.error('Failed to save profile:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-profile", async (event, name) => {
  try {
    const profiles = await downloader.deleteProfile(name);
    return { success: true, profiles };
  } catch (error) {
    console.error('Failed to delete profile:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced history management
ipcMain.handle("get-history", async () => {
  try {
    const history = await HistoryManager.loadHistory();
    return { success: true, history };
  } catch (error) {
    console.error('Failed to get history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("clear-history", async () => {
  try {
    const success = await HistoryManager.clearHistory();
    return { success };
  } catch (error) {
    console.error('Failed to clear history:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced file operations with smart path resolution
ipcMain.handle("open-file-location", async (event, filePath) => {
  console.log("Opening file location:", filePath);
  const result = await FileManager.showInFolder(filePath);
  
  if (result.success) {
    console.log('Successfully opened location:', result.actualPath || 'directory');
  } else {
    console.error('Failed to open location:', result.error);
  }
  
  return result;
});

ipcMain.handle("open-file", async (event, filePath) => {
  console.log("Opening file:", filePath);
  const result = await FileManager.openFile(filePath);
  
  if (result.success) {
    console.log('Successfully opened file:', result.actualPath);
  } else {
    console.error('Failed to open file:', result.error);
  }
  
  return result;
});

// Enhanced file verification
ipcMain.handle("verify-file", async (event, filePath) => {
  try {
    const actualPath = await FileManager.findActualFile(filePath);
    return {
      success: true,
      exists: !!actualPath,
      actualPath: actualPath,
      originalPath: filePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      exists: false
    };
  }
});

// IPC for dependency download status
ipcMain.on('dependency-download-status-request', (event) => {
  // This can be used by renderer to request status on load
  // (No-op for now, as status is pushed from main)
});

// IPC for manual update check
ipcMain.handle('check-for-update', async () => {
  try {
    const latestVersion = await checkForUpdate();
    return { success: true, latestVersion };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('download-latest-installer', async () => {
  try {
    const installer = await downloadLatestInstaller();
    return { success: true, installer };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('launch-latest-installer', async () => {
  try {
    await shell.openPath(AUTO_UPDATE.INSTALLER_PATH);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Enhanced history management
ipcMain.handle("get-video-info", async (event, url) => {
  try {
    const info = await Downloader.getVideoInfo(url);
    return { success: true, info };
  } catch (error) {
    console.error('Failed to get info:', error);
    return { success: false, error: error.message };
  }
});