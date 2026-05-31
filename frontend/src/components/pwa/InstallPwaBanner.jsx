import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Smartphone, Chrome, Share2, ExternalLink } from 'lucide-react';

let deferredPrompt = null;

const STORAGE_KEY = 'stockmate_pwa_dismissed';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const InstallPwaBanner = () => {
  const [show, setShow] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const dismissedRef = useRef(!!sessionStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isStandalone()) return;
    // Don't show if user dismissed
    if (dismissedRef.current) return;

    // Detect browser
    const ua = navigator.userAgent;
    setIsSafari(/Safari/.test(ua) && !/Chrome/.test(ua));
    setIsChrome(/Chrome/.test(ua) || /Edg/.test(ua));

    // Listen for beforeinstallprompt (Chrome/Edge/etc.)
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: show banner after a short delay for non-supporting browsers
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isStandalone() && !dismissedRef.current) {
        setShow(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge beforeinstallprompt flow
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        deferredPrompt = null;
        setShow(false);
      }
      deferredPrompt = null;
    } else {
      // No deferred prompt available — show manual instructions
      setShowManual(true);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setShowManual(false);
    dismissedRef.current = true;
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
  };

  if (showManual) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Install StockMate
            </h3>
            <button onClick={handleDismiss} className="btn-ghost p-1.5">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Install StockMate Pro on your device for quick access and offline support.
            </p>

            <div className="space-y-4">
              {/* Chrome / Android */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Chrome size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chrome / Android</p>
                  <ol className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Tap the <strong>⋮</strong> menu (three dots)</li>
                    <li>Select <strong>"Add to Home Screen"</strong> or <strong>"Install app"</strong></li>
                    <li>Tap <strong>"Install"</strong> on the prompt</li>
                  </ol>
                </div>
              </div>

              {/* Safari / iOS */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Smartphone size={20} className="text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Safari / iPhone</p>
                  <ol className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Tap the <strong>Share</strong> icon <Share2 size={12} className="inline" /></li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> in the top right</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-lg bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800">
              <p className="text-xs text-accent-700 dark:text-accent-300 flex items-start gap-2">
                <ExternalLink size={14} className="mt-0.5 flex-shrink-0" />
                Once installed, StockMate Pro will launch in its own window with offline support enabled.
              </p>
            </div>

            <button onClick={handleDismiss} className="mt-5 btn-primary w-full">
              <Download size={16} />
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 max-w-md mx-auto lg:mx-0 lg:left-auto lg:right-4 animate-slide-up">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
          <Download size={24} className="text-accent-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Install StockMate
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Get quick access & offline support
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleInstall}
            className="btn-primary btn-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download size={14} />
            {deferredPrompt ? 'Install' : 'How to Install'}
          </button>
          <button
            onClick={handleDismiss}
            className="btn-ghost p-1.5"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaBanner;
