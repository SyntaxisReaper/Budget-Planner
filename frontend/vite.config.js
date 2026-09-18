import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
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
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
  },
});
