import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Base path for GitHub Pages deployment.
 * The repository is deployed as https://<user>.github.io/asif-esp32-rgb-controller/
 * Override with the BASE_PATH environment variable when hosting at a custom root.
 */
const BASE_PATH = process.env.BASE_PATH ?? '/asif-esp32-rgb-controller/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/**'],
      manifest: {
        id: '/',
        name: 'ASIF RGB Controller',
        short_name: 'RGB Control',
        description: 'Bluetooth RGB LED controller for the ESP32-S3',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
