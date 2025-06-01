const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Clipboard operations
  getClipboardText: () => ipcRenderer.invoke("get-clipboard-text"),
  validateUrl: (url) => ipcRenderer.invoke("validate-url", url),

  // Format information
  getFormats: (url) => ipcRenderer.invoke("get-formats", url),

  // Download operations
  startDownload: (options) => ipcRenderer.send("start-download", options),
  cancelDownload: () => ipcRenderer.send("cancel-download"),

  // Event listeners
  onProgress: (callback) =>
    ipcRenderer.on("download-progress", (event, progress) =>
      callback(progress)
    ),
  onComplete: (callback) =>
    ipcRenderer.on("download-complete", (event, result) => callback(result)),
  onError: (callback) =>
    ipcRenderer.on("download-error", (event, error) => callback(error)),

  // Dependency and update download status/progress
  onDependencyStatus: (callback) =>
    ipcRenderer.on("dependency-download-status", (event, status) => callback(status)),
  onDependencyProgress: (callback) =>
    ipcRenderer.on("dependency-download-progress", (event, progress) => callback(progress)),

  // File path operations
  selectOutputPath: () => ipcRenderer.invoke("select-output-path"),
  getOutputPath: () => ipcRenderer.invoke("get-output-path"),
  openFileLocation: (filePath) =>
    ipcRenderer.invoke("open-file-location", filePath),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),

  // Profile management
  getProfiles: () => ipcRenderer.invoke("get-profiles"),
  saveProfile: (name, options) =>
    ipcRenderer.invoke("save-profile", name, options),
  deleteProfile: (name) => ipcRenderer.invoke("delete-profile", name),

  // History management
  getHistory: () => ipcRenderer.invoke("get-history"),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  getVideoInfo: (url) => ipcRenderer.invoke("get-video-info"),
  verifyFile: (filePath) => ipcRenderer.invoke("verify-file")
});

contextBridge.exposeInMainWorld('appInfo', {
  version: null,
  onVersion: (callback) => ipcRenderer.on('app-version', (event, version) => callback(version)),
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (...args) => ipcRenderer.on(...args),
    send: (...args) => ipcRenderer.send(...args),
    invoke: (...args) => ipcRenderer.invoke(...args),
    removeAllListeners: (...args) => ipcRenderer.removeAllListeners(...args)
  }
});