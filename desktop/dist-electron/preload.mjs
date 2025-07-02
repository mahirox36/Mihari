"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  // Generic invoke for any channel
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
  // Generic on for any channel
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  // Generic removeListener for any channel
  removeListener: (channel, callback) => {
    electron.ipcRenderer.removeListener(channel, (_event, ...args) => callback(...args));
  },
  // Specific helpers
  minimize: () => electron.ipcRenderer.send("window-minimize"),
  maximize: () => electron.ipcRenderer.send("window-maximize"),
  close: () => electron.ipcRenderer.send("window-close"),
  showInFolder: (filePath) => electron.ipcRenderer.send("show-in-folder", filePath),
  openFile: (filePath) => electron.ipcRenderer.invoke("open-file", filePath),
  getPaste: () => electron.ipcRenderer.invoke("get-clipboard-text"),
  selectOutputPath: () => electron.ipcRenderer.invoke("select-output-path"),
  onBackendReady: (callback) => {
    electron.ipcRenderer.on("backend-ready", (_event) => {
      callback();
    });
  }
});
