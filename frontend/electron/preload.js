/**
 * StockMate Pro — Electron Preload Script
 *
 * Exposes a safe API to the renderer process via contextBridge.
 * The renderer can access these methods through `window.electronAPI`.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Get app metadata */
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  /** Get the backend server URL */
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),

  /** Detect if running inside Electron */
  isElectron: true,

  /** Platform info */
  platform: process.platform,

  /** Open a URL in the default browser */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
