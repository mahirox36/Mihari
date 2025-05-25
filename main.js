const {
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const Store = require("electron-store");
const Downloader = require("./downloader");
const { version } = require("./package.json");

// Initialize data storage
const store = new Store();
const downloader = new Downloader();

// Load download history
let downloadHistory = store.get("downloadHistory", []);

// Set up history file
const historyPath = path.join(app.getPath("userData"), "history.json");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
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
    },
    icon: path.join(__dirname, "assets", "icon.png"),
  }); // Load the index.html file

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("app-version", version);
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

// Application lifecycle events
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for clipboard
ipcMain.handle("get-clipboard-text", () => {
  return clipboard.readText();
});

ipcMain.handle("validate-url", (event, url) => {
  return downloader.validateUrl(url);
});

// IPC handlers for format information
ipcMain.handle("get-formats", async (event, url) => {
  try {
    const formats = await downloader.getFormats(url);
    return formats;
  } catch (error) {
    throw error.toString();
  }
});

// Download handling
ipcMain.on("start-download", (event, options) => {
  downloader
    .download(options.url, options, {
      onProgress: (progress) => {
        event.reply("download-progress", progress);
      },
      onError: (error) => {
        event.reply("download-error", error);
      },
      onComplete: (result) => {
        // Add to history
        const historyItem = {
          url: options.url,
          type: options.type || "video",
          quality: options.videoQuality || options.audioQuality || "default",
          format: options.format || "default",
          date: new Date().toISOString(),
          filename: result.filename,
          filePath: result.path,
        };

        downloadHistory.unshift(historyItem);
        if (downloadHistory.length > 100) downloadHistory.pop();
        store.set("downloadHistory", downloadHistory);

        event.reply("download-complete", {
          message: "Download completed successfully.",
          historyItem,
        });
      },
    })
    .catch((error) => {
      event.reply("download-error", error.toString());
    });
});

// Cancel download
ipcMain.on("cancel-download", () => {
  downloader.cancel();
});

// Handle output path selection
ipcMain.handle("select-output-path", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Download Location",
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    downloader.setOutputPath(selectedPath);
    return selectedPath;
  }

  return null;
});

// Get current output path
ipcMain.handle("get-output-path", () => {
  return downloader.outputPath;
});

// Handle profiles
ipcMain.handle("get-profiles", () => {
  return downloader.getProfiles();
});

ipcMain.handle("save-profile", (event, name, options) => {
  return downloader.saveProfile(name, options);
});

ipcMain.handle("delete-profile", (event, name) => {
  return downloader.deleteProfile(name);
});

// Download history management
ipcMain.handle("get-history", () => {
  return downloadHistory;
});

ipcMain.handle("clear-history", () => {
  downloadHistory = [];
  store.set("downloadHistory", []);
  return true;
});

// Open file in explorer/finder
ipcMain.handle("open-file-location", (event, filePath) => {
  console.log("Opening file location:", filePath);
  // Check if the file exists before trying to open it
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

// Open file with default application
ipcMain.handle("open-file", (event, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});
