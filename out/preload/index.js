"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", {
      ...preload.electronAPI,
      saveExcel: (data) => {
        electron.ipcRenderer.invoke("save-excel", data);
      },
      saveOcrExcel: (data) => {
        electron.ipcRenderer.invoke("save-ocr-excel", data);
      },
      ocrEmptyPath: (data) => electron.ipcRenderer.invoke("ocr-empty-path", data),
      imagesToPdf: (data) => electron.ipcRenderer.invoke("images-to-pdf", data),
      pdfToImg: () => electron.ipcRenderer.invoke("pdf-to-img"),
      onLog: (callback) => {
        electron.ipcRenderer.on("pdf-log", (_, msg) => callback(msg));
      }
    });
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
