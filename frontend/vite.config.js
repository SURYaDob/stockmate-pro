import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icons/icon-192x192.svg',
        'icons/icon-512x512.svg',
        'icons/mask-icon.svg',
        'icons/apple-splash-*.svg',
      ],
      manifest: {
        name: 'StockMate Pro',
        short_name: 'StockMate',
        description: 'Inventory Management for Hardware & Maintenance Businesses',
        theme_color: '#8b5cf6',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        id: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['business', 'productivity', 'utilities'],
        display_override: ['standalone', 'minimal-ui'],
        edge_side_panel: {},
        prefer_related_applications: false,
        screenshots: [],
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/mask-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New Sale',
            short_name: 'Sale',
            description: 'Create a new sales invoice',
            url: '/sales/new',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
          {
            name: 'Inventory',
            short_name: 'Stock',
            description: 'View inventory',
            url: '/inventory',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Home',
            description: 'View dashboard',
            url: '/dashboard',
            icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
