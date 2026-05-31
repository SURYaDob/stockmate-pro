import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  APP_VERSION,
  RELEASE_NOTES,
  getLastSeenVersion,
  markVersionSeen,
  hasNewReleaseNotes,
  getUnseenReleaseNotes,
} from '../../version';

/**
 * Update notification + "What's new" dialog.
 *
 * Uses `useRegisterSW` from `virtual:pwa-register/react` (the canonical
 * PWA API from vite-plugin-pwa) to detect when a new service worker
 * is waiting to be activated.
 */
const UpdateNotification = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [updateAccepted, setUpdateAccepted] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Show "What's new" dialog on first load after an update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasNewReleaseNotes()) {
        setShowWhatsNew(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    setUpdateAccepted(true);
    setNeedRefresh(false);
    updateServiceWorker();
  };

  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };

  const handleCloseWhatsNew = () => {
    markVersionSeen();
    setShowWhatsNew(false);
  };

  const unseenNotes = getUnseenReleaseNotes();
  const lastVersion = getLastSeenVersion();

  return (
    <>
      {/* Update available banner */}
      {needRefresh && !updateAccepted && (
        <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 max-w-md mx-auto lg:mx-0 lg:left-auto lg:right-4 animate-slide-up">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-accent-200 dark:border-accent-800 p-4 flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
              <RefreshCw size={18} className="text-accent-600 dark:text-accent-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Update available
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                A new version of StockMate is ready
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUpdate}
                className="btn-primary btn-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={handleDismissUpdate}
                className="btn-ghost p-1.5"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* What's new dialog */}
      {showWhatsNew && (
        <div className="modal-overlay z-[70]" onClick={handleCloseWhatsNew}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <Sparkles size={20} className="text-accent-600 dark:text-accent-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  What&rsquo;s new in StockMate
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  v{APP_VERSION}
                  {lastVersion && (
                    <>
                      {' '}· updated from v{lastVersion}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={handleCloseWhatsNew}
                className="btn-ghost p-2"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[50vh] px-6 py-4 divide-y divide-slate-100 dark:divide-slate-700">
              {unseenNotes.length === 0 && RELEASE_NOTES[APP_VERSION] ? (
                <div className="py-2">
                  <p className="text-xs font-semibold text-accent-500 uppercase tracking-wider mb-3">
                    v{APP_VERSION}
                  </p>
                  <ul className="space-y-2.5">
                    {RELEASE_NOTES[APP_VERSION].map((note, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent-500 mt-1.5" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                unseenNotes.map(({ version, notes }, vi) => (
                  <div key={version} className={`py-2 ${vi > 0 ? 'pt-4' : ''}`}>
                    <p className="text-xs font-semibold text-accent-500 uppercase tracking-wider mb-3">
                      v{version}
                      {vi === 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                          <Sparkles size={10} />
                          Latest
                        </span>
                      )}
                    </p>
                    <ul className="space-y-2.5">
                      {notes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent-500 mt-1.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Check the{' '}
                <a
                  href="#"
                  className="text-accent-500 hover:text-accent-600 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCloseWhatsNew();
                  }}
                >
                  release notes
                </a>{' '}
                for details
              </p>
              <button
                onClick={handleCloseWhatsNew}
                className="btn-primary btn-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateNotification;
