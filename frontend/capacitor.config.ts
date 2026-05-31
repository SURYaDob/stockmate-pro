import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockmate.pro',
  appName: 'StockMate Pro',
  webDir: 'dist',
  server: {
    // Allow cleartext HTTP traffic (needed for connecting to backend in dev)
    cleartext: true,
    // For development, set this to your computer's local IP + Vite port
    // e.g., 'http://192.168.1.5:3000'
    // In production, leave empty to load from the bundled app files
    url: undefined,
  },
  android: {
    // Allow the app to access the network for API calls
    allowMixedContent: true,
  },
  ios: {
    // Required for iOS to allow HTTP traffic
    contentInset: 'always',
  },
  // Enable logging in development
  loggingBehavior: process.env.NODE_ENV === 'development' ? 'debug' : 'none',
  // Handle app backgrounding
  backgroundColor: '#0f172a',
  // Splash screen configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#8b5cf6',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
