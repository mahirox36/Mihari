import { ipcRenderer, contextBridge, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("api", {
  // Generic invoke for any channel
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  // Generic on for any channel
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  // Generic removeListener for any channel
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, (_event, ...args) => callback(...args));
  },
  // Specific helpers
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  showInFolder: (filePath: string) =>
    ipcRenderer.invoke("show-in-folder", filePath),
  openFile: (filePath: string) => ipcRenderer.invoke("open-file", filePath),
  getVersion: () => ipcRenderer.invoke("get-version"),
  notify: (title: string, body: string, filePath: string, buttons: boolean) =>
    ipcRenderer.invoke("show-notif", title, body, filePath, buttons),
  getPaste: () => ipcRenderer.invoke("get-clipboard-text"),
  selectOutputPath: () => ipcRenderer.invoke("select-output-path"),
  selectCookieFile: () => ipcRenderer.invoke("select-cookie-file"),
  pythonProcessStatus: () => ipcRenderer.invoke("python-process-status"),
  isUpdateAvailable: () => ipcRenderer.invoke("is-update-available"),
  onBackendReady: (callback: () => void) => {
    ipcRenderer.on("backend-ready", (_event: IpcRendererEvent) => {
      callback();
    });
  },
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
  // openPotatoWindow: () => ipcRenderer.send("open-potato-window"),
});
