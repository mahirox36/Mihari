var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, BrowserWindow, ipcMain, shell, dialog, clipboard } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fsSync, { promises } from "fs";
import require$$0, { spawn as spawn$1 } from "child_process";
import { promisify } from "util";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var childProcess = require$$0;
var spawn = childProcess.spawn;
var exec = childProcess.exec;
var treeKill = function(pid, signal, callback) {
  if (typeof signal === "function" && callback === void 0) {
    callback = signal;
    signal = void 0;
  }
  pid = parseInt(pid);
  if (Number.isNaN(pid)) {
    if (callback) {
      return callback(new Error("pid must be a number"));
    } else {
      throw new Error("pid must be a number");
    }
  }
  var tree = {};
  var pidsToProcess = {};
  tree[pid] = [];
  pidsToProcess[pid] = 1;
  switch (process.platform) {
    case "win32":
      exec("taskkill /pid " + pid + " /T /F", callback);
      break;
    case "darwin":
      buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
        return spawn("pgrep", ["-P", parentPid]);
      }, function() {
        killAll(tree, signal, callback);
      });
      break;
    default:
      buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
        return spawn("ps", ["-o", "pid", "--no-headers", "--ppid", parentPid]);
      }, function() {
        killAll(tree, signal, callback);
      });
      break;
  }
};
function killAll(tree, signal, callback) {
  var killed = {};
  try {
    Object.keys(tree).forEach(function(pid) {
      tree[pid].forEach(function(pidpid) {
        if (!killed[pidpid]) {
          killPid(pidpid, signal);
          killed[pidpid] = 1;
        }
      });
      if (!killed[pid]) {
        killPid(pid, signal);
        killed[pid] = 1;
      }
    });
  } catch (err) {
    if (callback) {
      return callback(err);
    } else {
      throw err;
    }
  }
  if (callback) {
    return callback();
  }
}
function killPid(pid, signal) {
  try {
    process.kill(parseInt(pid, 10), signal);
  } catch (err) {
    if (err.code !== "ESRCH") throw err;
  }
}
function buildProcessTree(parentPid, tree, pidsToProcess, spawnChildProcessesList, cb) {
  var ps = spawnChildProcessesList(parentPid);
  var allData = "";
  ps.stdout.on("data", function(data) {
    var data = data.toString("ascii");
    allData += data;
  });
  var onClose = function(code) {
    delete pidsToProcess[parentPid];
    if (code != 0) {
      if (Object.keys(pidsToProcess).length == 0) {
        cb();
      }
      return;
    }
    allData.match(/\d+/g).forEach(function(pid) {
      pid = parseInt(pid, 10);
      tree[parentPid].push(pid);
      tree[pid] = [];
      pidsToProcess[pid] = 1;
      buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
    });
  };
  ps.on("close", onClose);
}
const kill = /* @__PURE__ */ getDefaultExportFromCjs(treeKill);
const killAsync = promisify(kill);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
console.log("App root path:", process.env.APP_ROOT);
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
console.log("MAIN_DIST path:", MAIN_DIST);
console.log("RENDERER_DIST path:", RENDERER_DIST);
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let isShuttingDown = false;
class PythonProcessManager {
  constructor() {
    __publicField(this, "process", null);
    __publicField(this, "isReady", false);
    __publicField(this, "startupTimeout", null);
    __publicField(this, "STARTUP_TIMEOUT_MS", 3e4);
  }
  // 30 seconds
  async start(exePath) {
    if (this.process) {
      console.log("Python process already running, killing first...");
      await this.kill();
    }
    console.log("Starting Python process:", exePath);
    try {
      if (!fsSync.existsSync(exePath)) {
        throw new Error(`Python executable not found at: ${exePath}`);
      }
      this.process = spawn$1(exePath, [], {
        cwd: path.dirname(exePath),
        detached: false,
        // Keep as child process
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        // Hide console window on Windows
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1"
        }
      });
      this.setupProcessHandlers();
      this.startupTimeout = setTimeout(() => {
        console.error("Python process startup timeout");
        this.kill();
      }, this.STARTUP_TIMEOUT_MS);
      return true;
    } catch (error) {
      console.error("Failed to start Python process:", error);
      this.process = null;
      return false;
    }
  }
  setupProcessHandlers() {
    var _a, _b;
    if (!this.process) return;
    (_a = this.process.stdout) == null ? void 0 : _a.on("data", (data) => {
      try {
        const output = data.toString("utf8").trim();
        if (output) {
          console.log("[Python STDOUT]:", output);
          if (output.includes("Application startup complete") || output.includes("Uvicorn running")) {
            this.markAsReady();
          }
          this.sendToRenderer("python-output", {
            type: "stdout",
            data: output
          });
        }
      } catch (error) {
        console.error("Error processing stdout:", error);
      }
    });
    (_b = this.process.stderr) == null ? void 0 : _b.on("data", (data) => {
      try {
        const output = data.toString("utf8").trim();
        if (output) {
          console.error("[Python STDERR]:", output);
          this.sendToRenderer("python-output", {
            type: "stderr",
            data: output
          });
        }
      } catch (error) {
        console.error("Error processing stderr:", error);
      }
    });
    this.process.on("exit", (code, signal) => {
      console.log(`Python process exited with code ${code}, signal ${signal}`);
      this.cleanup();
      if (!isShuttingDown && code !== 0) {
        this.sendToRenderer("python-process-crashed", { code, signal });
      }
    });
    this.process.on("error", (error) => {
      console.error("Python process error:", error);
      this.cleanup();
      this.sendToRenderer("python-process-error", { error: error.message });
    });
    this.process.on("close", (code, signal) => {
      console.log(`Python process closed with code ${code}, signal ${signal}`);
      this.cleanup();
    });
  }
  markAsReady() {
    if (!this.isReady) {
      this.isReady = true;
      console.log("Python process is ready!");
      if (this.startupTimeout) {
        clearTimeout(this.startupTimeout);
        this.startupTimeout = null;
      }
      this.sendToRenderer("backend-ready", {});
    }
  }
  sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
  async kill() {
    if (!this.process) return;
    console.log("Killing Python process...");
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }
    const pid = this.process.pid;
    try {
      if (this.process.stdin && !this.process.stdin.destroyed) {
        this.process.stdin.write("quit\n");
        this.process.stdin.end();
      }
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      if (this.process && !this.process.killed && pid) {
        console.log("Force killing Python process tree...");
        await killAsync(pid);
      }
    } catch (error) {
      console.error("Error killing Python process:", error);
      if (this.process && !this.process.killed) {
        this.process.kill("SIGKILL");
      }
    }
    this.cleanup();
  }
  cleanup() {
    this.process = null;
    this.isReady = false;
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }
  }
  getProcess() {
    return this.process;
  }
  isProcessReady() {
    return this.isReady;
  }
  isProcessRunning() {
    return this.process !== null && !this.process.killed;
  }
}
const pythonManager = new PythonProcessManager();
async function killPythonProcess() {
  await pythonManager.kill();
}
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 810,
    minHeight: 650,
    frame: false,
    title: "Mihari - Ultimate Video Downloader",
    icon: path.join(process.env.VITE_PUBLIC, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  win.setMenuBarVisibility(false);
  const exePath = path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "backend"),
    "Mihari backend.exe"
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
    win.webContents.on("did-finish-load", async () => {
      console.log("Window loaded, starting Python process...");
      await pythonManager.start(exePath);
    });
    win.webContents.on("before-input-event", (event, input) => {
      const combo = input.key.toLowerCase();
      if (
        // (combo === "r" && (input.control || input.meta)) ||
        combo === "f5" || combo === "i" && input.control && input.shift || // Ctrl+Shift+I
        combo === "f12"
      ) {
        event.preventDefault();
      }
    });
  }
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Failed to load app:", errorCode, errorDescription);
  });
  win.on("closed", () => {
    win = null;
  });
}
async function gracefulShutdown() {
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
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
ipcMain.on("window-minimize", () => {
  const win2 = BrowserWindow.getFocusedWindow();
  if (win2) win2.minimize();
});
ipcMain.on("window-maximize", () => {
  const win2 = BrowserWindow.getFocusedWindow();
  if (win2 == null ? void 0 : win2.isMaximized()) win2.unmaximize();
  else win2 == null ? void 0 : win2.maximize();
});
ipcMain.on("window-close", () => {
  const win2 = BrowserWindow.getFocusedWindow();
  if (win2) win2.close();
});
ipcMain.on("show-in-folder", (_event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true, filePath };
  } catch (error) {
    console.error("Failed to show in folder:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("open-file", async (_event, filePath) => {
  try {
    const result = await shell.openPath(filePath);
    if (result) {
      throw new Error(`Failed to open file: ${result}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to open file:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("select-output-path", async () => {
  const win2 = BrowserWindow.getFocusedWindow();
  if (!win2) {
    return { success: false, error: "No active window found." };
  }
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win2, {
      properties: ["openDirectory", "createDirectory"],
      title: "Select Download Location",
      buttonLabel: "Select Folder",
      defaultPath: app.getPath("downloads")
    });
    if (canceled) {
      return { success: false, cancelled: true };
    }
    const selectedPath = filePaths[0];
    if (!selectedPath) {
      return { success: false, error: "No folder selected." };
    }
    try {
      const testFile = path.join(
        selectedPath,
        `.mihari_write_test_${Date.now()}`
      );
      await promises.writeFile(testFile, "test");
      await promises.unlink(testFile);
      return { success: true, path: selectedPath };
    } catch {
      return {
        success: false,
        error: "Selected folder is not writable. Please choose another location."
      };
    }
  } catch (error) {
    console.error("Path selection failed:", error);
    return { success: false, error: (error == null ? void 0 : error.message) || "Unknown error." };
  }
});
ipcMain.handle("get-clipboard-text", async () => {
  try {
    const text = clipboard.readText();
    return { success: true, text };
  } catch (error) {
    console.error("Failed to read clipboard:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("python-process-status", () => {
  return {
    running: pythonManager.isProcessRunning(),
    ready: pythonManager.isProcessReady()
  };
});
ipcMain.handle("restart-python-process", async () => {
  const exePath = path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "backend"),
    "Mihari backend.exe"
  );
  try {
    await pythonManager.kill();
    const success = await pythonManager.start(exePath);
    return { success };
  } catch (error) {
    console.error("Failed to restart Python process:", error);
    return { success: false, error: error.message };
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
