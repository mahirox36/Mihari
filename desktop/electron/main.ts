import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promises as fs } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

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
    },
  });

  win.setMenuBarVisibility(false);
  // Test active push message to Renderer-process.
  // win.webContents.on('did-finish-load', () => {
  //   win?.webContents.send('main-process-message', (new Date).toLocaleString())
  // })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});
ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});
ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.on("show-in-folder", (_event, filePath: string) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true, filePath };
  } catch (error: any) {
    console.error("Failed to show in folder:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-file", async (_event, filePath: string) => {
  try {
    const result = await shell.openPath(filePath);
    if (result) {
      throw new Error(`Failed to open file: ${result}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to open file:", error);
    return { success: false, error: error.message };
  }
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

ipcMain.handle("get-clipboard-text", async () => {
  try {
    const text = clipboard.readText();
    return { success: true, text: text };
  } catch (error: any) {
    console.error("Failed to read clipboard:", error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);
