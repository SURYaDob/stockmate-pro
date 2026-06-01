import React from 'react';
import { Download, RefreshCw, X, Loader2 } from 'lucide-react';
import { useAutoUpdate } from '../../hooks/useAutoUpdate';

/**
 * In-app update notification banner for the Electron desktop app.
 * Appears at the top of the MainLayout when an update is available or downloading.
 * No-op when running in a browser (non-Electron).
 */
const UpdateBanner = () => {
  const {
    updateAvailable,
    updateVersion,
    downloadProgress,
    isDownloading,
    installUpdate,
    dismissUpdate,
  } = useAutoUpdate();

  // Don't render if no update and not downloading
  if (!updateAvailable && !isDownloading) return null;

  return (
    <div className="sticky top-0 z-[60] bg-gradient-to-r from-accent-500 to-accent-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm animate-slide-down shadow-lg">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isDownloading ? (
          <>
            <Loader2 size={16} className="animate-spin flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">
                Downloading update{updateVersion ? ` v${updateVersion}` : ''}…
              </span>
              <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress || 0}%` }}
                />
              </div>
              <span className="text-[11px] text-white/70 mt-1 inline-block">
                {Math.round(downloadProgress || 0)}% complete
              </span>
            </div>
          </>
        ) : (
          <>
            <Download size={16} className="flex-shrink-0" />
            <span className="min-w-0">
              <span className="font-medium">
                Update available{updateVersion ? ` — v${updateVersion}` : ''}
              </span>
              <span className="text-white/80 ml-2 hidden sm:inline">
                Restart to apply
              </span>
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isDownloading ? (
          <span className="text-xs text-white/70 font-mono">
            {downloadProgress != null ? `${Math.round(downloadProgress)}%` : ''}
          </span>
        ) : (
          <>
            <button
              onClick={installUpdate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-accent-600 text-xs font-semibold hover:bg-white/90 active:scale-95 transition-all"
            >
              <RefreshCw size={13} />
              Restart & Install
            </button>
            <button
              onClick={dismissUpdate}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateBanner;
