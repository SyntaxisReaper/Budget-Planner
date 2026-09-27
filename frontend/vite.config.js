import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    process.env.TAURI_ENV_PLATFORM ? null : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Budget Planner',
        short_name: 'Budget',
        description: 'Your Smart Budget Planner',
        theme_color: '#13141c',
        background_color: '#13141c',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-48.webp', sizes: '48x48', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-72.webp', sizes: '72x72', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-96.webp', sizes: '96x96', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-128.webp', sizes: '128x128', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-192.webp', sizes: '192x192', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-256.webp', sizes: '256x256', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'any' },
          { src: 'icons/icon-192.webp', sizes: '192x192', type: 'image/webp', purpose: 'maskable' },
          { src: 'icons/icon-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // Slow-changing data — cache for 5 minutes, show cached version offline
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/(items|accounts|goals|settings|people|contacts|projects|trips|tasks|notes|subscriptions)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-slow-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24  // 1 day offline fallback
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Financial/time-sensitive data — network only, no offline stale data
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/(transactions|dashboard|analytics|budget|debts|income)/i,
            handler: 'NetworkOnly',  // If offline, this fails — OfflineBanner shows
          }
        ]
      }
    })
  ].filter(Boolean),
  server: {
    port: 5173,
  },
});
