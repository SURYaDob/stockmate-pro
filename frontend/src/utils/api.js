import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Detect if running in Capacitor (native mobile) vs browser/PWA
const isCapacitor = typeof window !== 'undefined' && window.Capacitor?.isNative;

// Determine the API base URL:
// 1. VITE_API_URL env var (set at build time)
// 2. For Capacitor: use the env var or fall back to local IP placeholder
// 3. For browser/PWA: use the Vite proxy ('/api')
const ENV_API_URL = import.meta.env.VITE_API_URL;
const getBaseUrl = () => {
  if (ENV_API_URL) return ENV_API_URL;
  if (isCapacitor) {
    // In Capacitor, there's no Vite proxy, so point directly to backend
    // For development: use your computer's local IP, e.g., http://192.168.1.5:5000
    // For production: use your hosted backend URL
    console.warn('[API] Running in Capacitor without VITE_API_URL set. Using relative /api — this will fail if backend is not on the same host.');
    return '/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Log the API base URL in development
if (import.meta.env.DEV) {
  console.log(`[API] Base URL: ${getBaseUrl()} ${isCapacitor ? '(Capacitor)' : '(Browser/PWA)'}`);
}

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshed = await useAuthStore.getState().refreshAuth();
        if (refreshed) {
          const newToken = useAuthStore.getState().token;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        processQueue(new Error('Refresh failed'));
        useAuthStore.getState().logout();
        window.location.href = '/login';
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
