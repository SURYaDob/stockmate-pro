import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator.onLine !== 'undefined' ? !navigator.onLine : false
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 dark:bg-amber-600 text-white text-center text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 animate-slide-down">
        <WifiOff size={14} />
        <span>You are offline. Some features may be limited.</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-500 text-white text-center text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 animate-slide-down">
        <Wifi size={14} />
        <span>Back online! Data is syncing.</span>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
