import { contextBridge, ipcRenderer, clipboard } from 'electron'
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
      imagesToPdf: (data) => ipcRenderer.invoke('images-to-pdf', data),
      clearFolder: (folder) => ipcRenderer.invoke('empty-folder', folder),
      getImagesCount: () => ipcRenderer.invoke('get-images-count'),
      readClipboard: () => clipboard.readText()
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
