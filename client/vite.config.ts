import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env variables from process.env (injected by Docker Compose)
  // and local .env files in the root folder (for non-docker environment)
  const env = { ...process.env, ...loadEnv(mode, '../', '') };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
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
      allowedHosts: (env.VITE_ALLOWED_HOSTS || env.ALLOWED_HOSTS)
        ? (env.VITE_ALLOWED_HOSTS || env.ALLOWED_HOSTS)
            .replace(/['"]/g, '')
            .split(',')
            .map(host => host.trim())
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
  };
});
