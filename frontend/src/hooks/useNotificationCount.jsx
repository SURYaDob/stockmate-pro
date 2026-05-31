import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

const POLL_INTERVAL = 60 * 1000; // 60 seconds

export const useNotificationCount = (enabled = true) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const fetchCount = useCallback(async () => {
    if (!enabledRef.current) return;

    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data?.count || 0);
    } catch {
      // Silently fail — don't spam errors on poll failures
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchCount(); // initial fetch

    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, fetchCount]);

  return { unreadCount, refreshCount: fetchCount };
};
