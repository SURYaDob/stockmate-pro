import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

/**
 * Hook to manage browser push notification subscription lifecycle.
 *
 * Handles:
 * - Checking notification permission
 * - Requesting permission
 * - Subscribing/unsubscribing via PushManager API
 * - Syncing subscription with the backend
 * - Fetching the VAPID public key
 */
export const usePushSubscription = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);
  const swRegistrationRef = useRef(null);

  // Check if push is supported
  useEffect(() => {
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
      setSupported(false);
      setError('Push notifications are not supported in this browser');
    }
  }, []);

  // Get the VAPID public key from the backend
  const getVapidPublicKey = useCallback(async () => {
    try {
      const res = await api.get('/notifications/vapid-public-key');
      return res.data.data?.publicKey || null;
    } catch {
      return null;
    }
  }, []);

  // Get the active service worker registration
  const getSWRegistration = useCallback(async () => {
    if (swRegistrationRef.current) return swRegistrationRef.current;

    // First try to get an existing registration
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      swRegistrationRef.current = existing;
      return existing;
    }

    // Wait for the SW to be ready (it's registered by vite-plugin-pwa)
    const reg = await navigator.serviceWorker.ready;
    swRegistrationRef.current = reg;
    return reg;
  }, []);

  // Check existing subscription
  const checkSubscription = useCallback(async () => {
    if (!supported) return;

    try {
      const reg = await getSWRegistration();
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      // Silently fail
    }
  }, [supported, getSWRegistration]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!supported) return false;

    setSubscribing(true);
    setError(null);

    try {
      // Request permission first
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          setError('Notification permission was denied');
          setSubscribing(false);
          return false;
        }
      }

      // Get VAPID key
      const publicKey = await getVapidPublicKey();
      if (!publicKey) {
        setError('Push notifications not configured (missing VAPID key). Contact your administrator.');
        setSubscribing(false);
        return false;
      }

      // Get SW registration and create subscription
      const reg = await getSWRegistration();
      const existingSub = await reg.pushManager.getSubscription();

      if (existingSub) {
        // Already subscribed - sync with backend
        await syncSubscription(existingSub);
        setIsSubscribed(true);
        setSubscribing(false);
        return true;
      }

      // Convert base64 VAPID key to Uint8Array
      const vapidKey = urlBase64ToUint8Array(publicKey);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Save to backend
      const success = await syncSubscription(sub);
      if (success) {
        setIsSubscribed(true);
      }
      setSubscribing(false);
      return success;
    } catch (err) {
      console.error('[PushSubscription] Subscribe error:', err);
      setError(err.message || 'Failed to subscribe to push notifications');
      setSubscribing(false);
      return false;
    }
  }, [supported, getSWRegistration, getVapidPublicKey]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!supported) return true;

    try {
      const reg = await getSWRegistration();
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
      }

      // Remove from backend
      try {
        await api.delete('/notifications/unsubscribe', {
          data: {}, // Will delete all subscriptions for this user
        });
      } catch {
        // Silently fail - backend cleanup is best-effort
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('[PushSubscription] Unsubscribe error:', err);
      return false;
    }
  }, [supported, getSWRegistration]);

  // Sync subscription with backend
  const syncSubscription = async (subscription) => {
    if (!subscription) return false;

    try {
      await api.post('/notifications/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          auth: arrayBufferToBase64(subscription.getKey('auth')),
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        },
        userAgent: navigator.userAgent,
      });
      return true;
    } catch (err) {
      console.error('[PushSubscription] Sync error:', err);
      return false;
    }
  };

  // Check subscription status on mount
  useEffect(() => {
    if (supported) {
      checkSubscription();
    }
  }, [supported, checkSubscription]);

  return {
    permission,
    isSubscribed,
    subscribing,
    error,
    supported,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
};

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 * Required for the VAPID applicationServerKey.
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Convert an ArrayBuffer to a base64 string.
 */
const arrayBufferToBase64 = (buffer) => {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
