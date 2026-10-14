import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function readColorSchemeStorageKey(): string {
  const source = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../packages/shared/src/schemas/color-scheme.ts'
    ),
    'utf8'
  );
  const match = /export const COLOR_SCHEME_STORAGE_KEY = '([^']+)'/.exec(
    source
  );
  if (match === null) {
    throw new Error(
      'COLOR_SCHEME_STORAGE_KEY is missing from packages/shared/src/schemas/color-scheme.ts'
    );
  }
  return match[1];
}

function colorSchemeStorageKeyPlugin(): Plugin {
  const storageKey = readColorSchemeStorageKey();
  return {
    name: 'color-scheme-storage-key',
    transformIndexHtml(html: string): string {
      return html.replaceAll('__COLOR_SCHEME_STORAGE_KEY__', storageKey);
    },
  };
}

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    colorSchemeStorageKeyPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'יום הנתינה',
        short_name: 'יום הנתינה',
        description: 'ניהול מתנדבים לחלוקת חבילות מזון חודשית',
        theme_color: '#A99BE0',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
    sentryVitePlugin({
      disable:
        process.env.SENTRY_AUTH_TOKEN === undefined ||
        process.env.SENTRY_AUTH_TOKEN.length === 0,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      url: process.env.SENTRY_URL || 'https://de.sentry.io',
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      telemetry: false,
    }),
  ],
  optimizeDeps: {
    exclude: ['@giving-day/shared', '@giving-day/ui'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
