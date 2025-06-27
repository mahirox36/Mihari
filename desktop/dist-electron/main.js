import { app, BrowserWindow, ipcMain, shell, dialog, clipboard } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promises } from "fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
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
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  win.setMenuBarVisibility(false);
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
