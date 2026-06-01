import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing Electron auto-update notifications.
 * Only active when running inside Electron (window.electronAPI exists).
 *
 * @returns {{ updateAvailable, updateVersion, downloadProgress, isDownloading, checkForUpdates, installUpdate, dismissUpdate }}
 */
export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  const isElectron = api?.isElectron === true;

  useEffect(() => {
    if (!api || !isElectron) return;

    const unsubAvailable = api.onUpdateAvailable((data) => {
      setUpdateAvailable(true);
      setUpdateVersion(data.version);
    });

    const unsubProgress = api.onUpdateProgress((data) => {
      setIsDownloading(true);
      setDownloadProgress(data.percent);
    });

    const unsubDownloaded = api.onUpdateDownloaded((data) => {
      setIsDownloading(false);
      setDownloadProgress(100);
      setUpdateVersion(data.version);
    });

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
    };
  }, [api, isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!api || !isElectron) return null;
    return api.checkForUpdates();
  }, [api, isElectron]);

  const installUpdate = useCallback(() => {
    if (!api || !isElectron) return;
    api.installUpdate();
  }, [api, isElectron]);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    setUpdateAvailable(false);
  }, []);

  return {
    updateAvailable: updateAvailable && !dismissed,
    updateVersion,
    downloadProgress,
    isDownloading,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
  };
}
