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

  // ─── Auto-Update APIs ─────────────────────────────────────────────────────

  /** Manually check for updates */
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  /** Quit and install the downloaded update */
  installUpdate: () => ipcRenderer.invoke('install-update'),

  /** Listen for update-available event from main process */
  onUpdateAvailable: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  /** Listen for update-progress event from main process */
  onUpdateProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },

  /** Listen for update-downloaded event from main process */
  onUpdateDownloaded: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
});
