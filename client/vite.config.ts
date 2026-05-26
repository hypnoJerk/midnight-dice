import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Midnight 1-4-24',
        short_name: 'Midnight',
        description: 'Multiplayer 1-4-24 (Midnight) Dice Game PWA',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: (process.env.VITE_ALLOWED_HOSTS || process.env.ALLOWED_HOSTS)
      ? (process.env.VITE_ALLOWED_HOSTS || process.env.ALLOWED_HOSTS)!.split(',')
      : ['localhost'],
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://server:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://server:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
