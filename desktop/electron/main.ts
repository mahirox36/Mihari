import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
  Notification,
  Tray,
  Menu,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promises as fs } from "fs";
import { spawn, ChildProcess } from "child_process";
import fsSync from "fs";
import kill from "tree-kill";
import { promisify } from "util";
import semver from "semver";
import os from "os";
import axios from "axios";

const MihariDataPath = path.join(app.getPath("appData"), "Mihari");
app.setPath("userData", MihariDataPath);

let filePath: string | null = null;
let isRendererReady = false;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", (_event, argv) => {
  if (win) {
    if (win.isMinimized()) win.restore();
    else if (!win.isVisible()) win.show();
    win.focus();
  }

  const file = argv.find((arg) => arg.endsWith(".mhrp"));
  if (file) {
    filePath = file;
    if (isRendererReady) {
      win?.webContents.send("open-file", filePath);
      filePath = null;
    }
  }
});

app.on("open-file", (event, path) => {
  event.preventDefault();
  win?.webContents.send("open-file", path);
});

export const api = axios.create({
  baseURL: "http://localhost:8153/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

const localVersion = app.getVersion();

let backendName =
  os.platform() === "win32" ? "Mihari backend.exe" : "Mihari backend";

let icon = os.platform() === "win32" ? "icon.ico" : "icon.png";

const killAsync = promisify(kill);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

// Add logging to help diagnose path issues
console.log("App root path:", process.env.APP_ROOT);

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

// Log important paths
console.log("MAIN_DIST path:", MAIN_DIST);
console.log("RENDERER_DIST path:", RENDERER_DIST);

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let tray: Tray | null = null;

// let potatoWin: BrowserWindow | null = null;
let isShuttingDown = false;

class PythonProcessManager {
  private process: ChildProcess | null = null;
  private isReady = false;
  private startupTimeout: NodeJS.Timeout | null = null;

  async start(exePath: string): Promise<boolean> {
    if (this.process) {
      console.log("Python process already running, killing first...");
      await this.kill();
    }

    console.log("Starting Python process:", exePath);

    try {
      // Verify the executable exists
      if (!fsSync.existsSync(exePath)) {
        throw new Error(`Python executable not found at: ${exePath}`);
      }

      this.process = spawn(exePath, [], {
        cwd: path.dirname(exePath),
        detached: false, // Keep as child process
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true, // Hide console window on Windows
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
      });

      // Set up process event handlers immediately
      this.setupProcessHandlers();

      return true;
    } catch (error) {
      console.error("Failed to start Python process:", error);
      this.process = null;
      return false;
    }
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    // Handle stdout (normal output)
    this.process.stdout?.on("data", (data: Buffer) => {
      try {
        const output = data.toString("utf8").trim();
        if (output) {
          console.log("[Python STDOUT]:", output);

          // Check for ready signal - look for multiple indicators
          if (
            output.includes("Application startup complete") ||
            output.includes("Uvicorn running")
          ) {
            this.markAsReady();
          }

          // Send output to renderer if needed
          this.sendToRenderer("python-output", {
            type: "stdout",
            data: output,
          });
        }
      } catch (error) {
        console.error("Error processing stdout:", error);
      }
    });

    // Handle stderr (error output)
    this.process.stderr?.on("data", (data: Buffer) => {
      try {
        const output = data.toString("utf8").trim();
        if (output) {
          console.error("[Python STDERR]:", output);
          this.sendToRenderer("python-output", {
            type: "stderr",
            data: output,
          });
        }
      } catch (error) {
        console.error("Error processing stderr:", error);
      }
    });

    // Handle process exit
    this.process.on("exit", (code: number | null, signal: string | null) => {
      console.log(`Python process exited with code ${code}, signal ${signal}`);
      this.cleanup();

      if (!isShuttingDown && code !== 0) {
        // Process crashed unexpectedly
        this.sendToRenderer("python-process-crashed", { code, signal });
      }
    });

    // Handle process errors
    this.process.on("error", (error: Error) => {
      console.error("Python process error:", error);
      this.cleanup();
      this.sendToRenderer("python-process-error", { error: error.message });
    });

    // Handle process close
    this.process.on("close", (code: number | null, signal: string | null) => {
      console.log(`Python process closed with code ${code}, signal ${signal}`);
      this.cleanup();
    });
  }

  private markAsReady(): void {
    if (!this.isReady) {
      this.isReady = true;
      console.log("Python process is ready!");

      // Clear startup timeout
      if (this.startupTimeout) {
        clearTimeout(this.startupTimeout);
        this.startupTimeout = null;
      }

      this.sendToRenderer("backend-ready", {});
    }
  }

  private sendToRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }

  async kill(): Promise<void> {
    if (!this.process) return;

    console.log("Killing Python process...");

    // Clear startup timeout
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }

    const pid = this.process.pid;

    try {
      // First try graceful shutdown
      if (this.process.stdin && !this.process.stdin.destroyed) {
        this.process.stdin.write("quit\n");
        this.process.stdin.end();
      }

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // If process is still running, force kill
      if (this.process && !this.process.killed && pid) {
        console.log("Force killing Python process tree...");
        await killAsync(pid);
      }
    } catch (error) {
      console.error("Error killing Python process:", error);

      // Last resort: direct kill
      if (this.process && !this.process.killed) {
        this.process.kill("SIGKILL");
      }
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.process = null;
    this.isReady = false;

    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }
  }

  getProcess(): ChildProcess | null {
    return this.process;
  }

  isProcessReady(): boolean {
    return this.isReady;
  }

  isProcessRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}

const pythonManager = new PythonProcessManager();

async function killPythonProcess(): Promise<void> {
  await pythonManager.kill();
}

function createWindow() {
  app.setAppUserModelId("online.mahirou.mihari.dashboard");
  win = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 850,
    minHeight: 650,
    frame: false,
    title: "Mihari - Ultimate Video Downloader",
    icon: path.join(process.env.VITE_PUBLIC, icon),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: false,
    },
  });

  win.setMenuBarVisibility(false);
  tray = new Tray(path.join(process.env.VITE_PUBLIC, icon));
  const url = "http://localhost:8153/api/v1/settings";
  let downloads_path: null | string = null;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Paste and Download",
      type: "normal",
      click: () => {
        win?.webContents.send("download-request");
      },
    },
    {
      label: "Open Downloads Folder",
      type: "normal",
      click: async () => {
        if (!downloads_path) {
          const response = await fetch(url);
          const settingsFetch: Record<
            string,
            Record<string, string>
          > = await response.json();
          downloads_path = settingsFetch.value.download_path;
        }
        shell.openPath(downloads_path);
      },
    },
    {
      label: "Quit",
      type: "normal",
      click: () => {
        win?.close();
      },
    },
  ]);
  tray.setToolTip("Mihari: Media Downloader");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    win?.show();
  });

  const exePath = path.join(
    app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, "..", "backend"),
    backendName
  );

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL).catch((err) => {
      console.error("Failed to load dev server URL:", err);
    });
  } else {
    const htmlPath = path.join(RENDERER_DIST, "index.html");
    console.log("Loading production HTML from:", htmlPath);

    if (!fsSync.existsSync(htmlPath)) {
      dialog.showErrorBox(
        "Missing File",
        `index.html not found at: ${htmlPath}`
      );
      return;
    }

    win.loadFile(htmlPath).catch((err) => {
      console.error("Failed to load index.html:", err);
      dialog.showErrorBox(
        "Load Error",
        `Failed to load index.html: ${err.message}`
      );
    });

    // Start Python process after window loads
    win.webContents.on("did-finish-load", async () => {
      console.log("Window loaded, starting Python process...");
      await pythonManager.start(exePath);
    });

    win.webContents.on("before-input-event", (event, input) => {
      const combo = input.key.toLowerCase();

      if (
        // (combo === "r" && (input.control || input.meta)) ||
        // combo === "f5" ||
        // (combo === "i" && input.control && input.shift) || // Ctrl+Shift+I
        combo === "f12"
      ) {
        event.preventDefault();
      }
    });
  }

  // Add error handling for failed page loads
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Failed to load app:", errorCode, errorDescription);
  });

  // Handle window close
  win.on("closed", () => {
    win = null;
  });
}

// Graceful shutdown handlers
async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log("Initiating graceful shutdown...");

  try {
    await killPythonProcess();
    console.log("Python process terminated successfully");
  } catch (error) {
    console.error("Error during Python process termination:", error);
  }
}

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    await gracefulShutdown();
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (!isShuttingDown) {
    event.preventDefault();
    await gracefulShutdown();
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Process termination handlers
process.on("exit", () => {
  console.log("Process exiting...");
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  await gracefulShutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  await gracefulShutdown();
  process.exit(0);
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception:", error);
  await gracefulShutdown();
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  await gracefulShutdown();
  process.exit(1);
});

// IPC handlers
ipcMain.on("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});

ipcMain.on("window-close", (_event, closeToTray: boolean) => {
  const win = BrowserWindow.getFocusedWindow();
  console.log(closeToTray);
  if (win && !closeToTray) win.close();
  if (win && closeToTray) win.hide();
});

function showInFolder(filePath: string) {
  try {
    if (!fsSync.existsSync(filePath)) {
      return { success: false, error: "The specified file could not be found" };
    }
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to show in folder:", error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle("show-in-folder", (_event, filePath: string) => {
  showInFolder(filePath);
});

async function openFile(filePath: string) {
  try {
    if (!fsSync.existsSync(filePath)) {
      return { success: false, error: "The specified file could not be found" };
    }
    const result = await shell.openPath(filePath);
    if (result) {
      throw new Error(`Failed to open file: ${result}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error("Failed to open file:", error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle("open-file", async (_event, filePath: string) => {
  await openFile(filePath);
});

ipcMain.handle("get-version", () => localVersion);

ipcMain.handle("handle-file", async (_event, file: string) => {
  return (await api.post("/presets/import", { path: file })).data;
});

ipcMain.on("open-external", (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle("select-output-path", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    return { success: false, error: "No active window found." };
  }

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
      title: "Select Download Location",
      buttonLabel: "Select Folder",
      defaultPath: app.getPath("downloads"),
    });

    if (canceled) {
      return { success: false, cancelled: true };
    }

    const selectedPath = filePaths[0];
    if (!selectedPath) {
      return { success: false, error: "No folder selected." };
    }

    try {
      // Check write permission by attempting to write and remove a temp file
      const testFile = path.join(
        selectedPath,
        `.mihari_write_test_${Date.now()}`
      );
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);
      return { success: true, path: selectedPath };
    } catch {
      return {
        success: false,
        error:
          "Selected folder is not writable. Please choose another location.",
      };
    }
  } catch (error: any) {
    console.error("Path selection failed:", error);
    return { success: false, error: error?.message || "Unknown error." };
  }
});

ipcMain.handle("select-cookie-file", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    return { success: false, error: "No active window found." };
  }

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      title: "Select Cookie File",
      buttonLabel: "Select File",
      filters: [
        { name: "Cookies", extensions: ["txt", "json", "cookie", "cookies"] },
        { name: "All Files", extensions: ["*"] },
      ],
      defaultPath: app.getPath("downloads"),
    });

    if (canceled) {
      return { success: false, cancelled: true };
    }

    const selectedFile = filePaths[0];
    if (!selectedFile) {
      return { success: false, error: "No file selected." };
    }

    return { success: true, path: selectedFile };
  } catch (error: any) {
    console.error("Cookie file selection failed:", error);
    return { success: false, error: error?.message || "Unknown error." };
  }
});

ipcMain.handle("select-mhrp-file", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    return { success: false, error: "No active window found." };
  }

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ["openFile", "multiSelections"],
      title: "Select Mihari Preset File",
      buttonLabel: "Select File",
      filters: [{ name: "Mihari Preset", extensions: ["mhrp"] }],
      defaultPath: app.getPath("downloads"),
    });

    if (canceled) {
      return { success: false, cancelled: true };
    }

    const selectedFile = filePaths;
    if (!selectedFile) {
      return { success: false, error: "No file selected." };
    }

    return { success: true, paths: selectedFile };
  } catch (error: any) {
    console.error("Mihari Preset file selection failed:", error);
    return { success: false, error: error?.message || "Unknown error." };
  }
});

ipcMain.handle("save-mhrp-file", async (_event, name: string) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    return { success: false, error: "No active window found." };
  }

  try {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Save Mihari Preset File",
      buttonLabel: "Save",
      filters: [{ name: "Mihari Preset", extensions: ["mhrp"] }],
      defaultPath: app.getPath("downloads") + `/${name}.mhrp`,
    });

    if (canceled) {
      return { success: false, cancelled: true };
    }

    const selectedFile = filePath;
    if (!selectedFile) {
      return { success: false, error: "No file selected." };
    }

    return { success: true, path: selectedFile };
  } catch (error: any) {
    console.error("Mihari Preset file selection failed:", error);
    return { success: false, error: error?.message || "Unknown error." };
  }
});

ipcMain.handle("get-clipboard-text", async () => {
  try {
    const text = clipboard.readText();
    return { success: true, text: text };
  } catch (error: any) {
    console.error("Failed to read clipboard:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("is-update-available", async () => {
  try {
    const response = await fetch(
      "https://api.github.com/repos/mahirox36/mihari/releases/latest"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch latest release info");
    }

    const data = await response.json();
    let latestVersion = data.tag_name as string;

    if (latestVersion.startsWith("v")) {
      latestVersion = latestVersion.slice(1);
    }

    const updateAvailable = semver.gt(latestVersion, localVersion);
    return {
      updateAvailable,
      localVersion,
      latestVersion,
    };
  } catch (error) {
    return {
      updateAvailable: false,
      localVersion,
      latestVersion: "1.0.0",
    };
  }
});

ipcMain.handle(
  "show-notif",
  (_event, title: string, body: string, filePath: string, buttons: boolean) => {
    if (win && !win.isFocused()) {
      const notif = new Notification({
        title,
        body,
        icon: path.join(process.env.VITE_PUBLIC || __dirname, icon),
        actions: buttons
          ? [
              { type: "button", text: "Open file" },
              { type: "button", text: "Show in folder" },
            ]
          : [],
        closeButtonText: "Close",
      });
      notif.on("click", () => {
        console.log("Notification clicked!");
        if (win) win.focus();
      });

      notif.on("action", async (_event, index) => {
        if (index === 0) {
          await openFile(filePath);
        } else if (index === 1) {
          showInFolder(filePath);
        }
      });

      notif.show();
      return true;
    } else {
      return false;
    }
  }
);

// Python process management IPC handlers
ipcMain.handle("python-process-status", () => {
  return {
    running: pythonManager.isProcessRunning(),
    ready: pythonManager.isProcessReady(),
  };
});

ipcMain.handle("restart-python-process", async () => {
  const exePath = path.join(
    app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, "..", "backend"),
    backendName
  );

  try {
    await pythonManager.kill();
    const success = await pythonManager.start(exePath);
    return { success };
  } catch (error: any) {
    console.error("Failed to restart Python process:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.on("renderer-ready", () => {
  isRendererReady = true;
  if (filePath) {
    win?.webContents.send("open-file", filePath);
    filePath = null;
  }
});

app.whenReady().then(() => {
  createWindow();
  const launchFile = process.argv.find((arg) => arg.endsWith(".mhrp"));
  if (launchFile) {
    filePath = launchFile;
  }
});
