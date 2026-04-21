import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      saveExcel: (data) => {
        ipcRenderer.invoke('save-excel', data)
      },
      saveOcrExcel: (data) => {
        ipcRenderer.invoke('save-ocr-excel', data)
      },
      ocrEmptyPath: (data) => ipcRenderer.invoke('ocr-empty-path', data),
      imagesToPdf: (data) => ipcRenderer.invoke('images-to-pdf', data),
      pdfToImg: () => ipcRenderer.invoke('pdf-to-img'),
      onLog: (callback) => {
        ipcRenderer.on('pdf-log', (_, msg) => callback(msg));
      }
    });
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
