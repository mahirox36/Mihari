import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld("api", {
  // Generic invoke for any channel
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
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
  showInFolder: (filePath: string) => ipcRenderer.invoke("show-in-folder", filePath),
  openFile: (filePath: string) => ipcRenderer.invoke("open-file", filePath),
  getPaste: () => ipcRenderer.invoke("get-clipboard-text"),
  selectOutputPath: () => ipcRenderer.invoke("select-output-path"),
  selectCookieFile: () => ipcRenderer.invoke("select-cookie-file"),
  onBackendReady: (callback: () => void) => {
    ipcRenderer.on("backend-ready", (_event: IpcRendererEvent) => {
      callback();
    });
  },
});